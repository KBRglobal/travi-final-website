/**
 * Search Intelligence - Query Normalizer
 *
 * Normalizes and clusters similar queries.
 */

// Common stop words to remove for analysis
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'and', 'or', 'but', 'not', 'no', 'yes',
  'what', 'where', 'when', 'who', 'how', 'which', 'why',
  'near', 'nearby', 'best', 'top', 'good', 'cheap', 'free',
  'dubai', 'uae', 'emirates', // Location context
]);

// Common typo corrections
const TYPO_MAP: Record<string, string> = {
  'resturant': 'restaurant',
  'restraunt': 'restaurant',
  'restarant': 'restaurant',
  'hotl': 'hotel',
  'atraction': 'attraction',
  'beech': 'beach',
  'mall': 'mall',
  'shoping': 'shopping',
};

export interface NormalizedQuery {
  original: string;
  normalized: string;
  tokens: string[];
  entities: string[];
  intent: 'search' | 'location' | 'category' | 'specific' | 'unknown';
}

/**
 * Normalize a search query.
 */
export function normalizeQuery(query: string): NormalizedQuery {
  const original = query;
  let normalized = query.toLowerCase().trim();

  // Fix common typos
  for (const [typo, correction] of Object.entries(TYPO_MAP)) {
    normalized = normalized.replace(new RegExp(typo, 'gi'), correction);
  }

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ');

  // Extract tokens (words)
  const allTokens = normalized.split(' ').filter(t => t.length > 1);

  // Remove stop words for analysis
  const tokens = allTokens.filter(t => !STOP_WORDS.has(t));

  // Detect entities (simplified - looking for capitalized or quoted terms)
  const entities = extractEntities(original);

  // Detect intent
  const intent = detectIntent(normalized, tokens);

  return {
    original,
    normalized,
    tokens,
    entities,
    intent,
  };
}

/**
 * Extract potential entity names from query.
 */
function extractEntities(query: string): string[] {
  const entities: string[] = [];

  // Quoted strings
  const quoted = query.match(/"([^"]+)"/g);
  if (quoted) {
    entities.push(...quoted.map(q => q.replace(/"/g, '')));
  }

  // Capitalized words (potential proper nouns)
  const words = query.split(/\s+/);
  for (const word of words) {
    if (word.length > 2 && word[0] === word[0].toUpperCase() && !STOP_WORDS.has(word.toLowerCase())) {
      entities.push(word);
    }
  }

  return [...new Set(entities)];
}

/**
 * Detect query intent.
 */
function detectIntent(
  query: string,
  tokens: string[]
): 'search' | 'location' | 'category' | 'specific' | 'unknown' {
  // Location-based
  if (/\b(near|in|at|around)\b/i.test(query)) {
    return 'location';
  }

  // Category-based
  const categories = ['hotel', 'restaurant', 'attraction', 'beach', 'mall', 'museum', 'park'];
  if (tokens.some(t => categories.includes(t))) {
    return 'category';
  }

  // Specific search (has proper nouns)
  if (tokens.some(t => t[0] === t[0]?.toUpperCase())) {
    return 'specific';
  }

  // General search
  if (tokens.length > 0) {
    return 'search';
  }

  return 'unknown';
}

/**
 * Calculate similarity between two normalized queries.
 */
export function querySimilarity(a: NormalizedQuery, b: NormalizedQuery): number {
  const setA = new Set(a.tokens);
  const setB = new Set(b.tokens);

  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Cluster similar queries together.
 */
export function clusterQueries(
  queries: string[],
  threshold: number = 0.5
): Map<string, string[]> {
  const normalized = queries.map(q => normalizeQuery(q));
  const clusters = new Map<string, string[]>();
  const assigned = new Set<number>();

  for (let i = 0; i < normalized.length; i++) {
    if (assigned.has(i)) continue;

    const cluster: string[] = [queries[i]];
    assigned.add(i);

    for (let j = i + 1; j < normalized.length; j++) {
      if (assigned.has(j)) continue;

      const similarity = querySimilarity(normalized[i], normalized[j]);
      if (similarity >= threshold) {
        cluster.push(queries[j]);
        assigned.add(j);
      }
    }

    clusters.set(normalized[i].normalized, cluster);
  }

  return clusters;
}
