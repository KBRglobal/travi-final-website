/**
 * Octopus Engine - Web Search Enrichment
 * Enriches entities with web search data
 * Reviews, prices, additional info from various sources
 */

import { getAllUnifiedProviders } from '../ai/providers';
import { log } from '../lib/logger';
import { fetchWithTimeout } from '../lib/fetch-with-timeout';
import type { EnrichedEntity } from './google-maps-enricher';

const WEB_SEARCH_TIMEOUT_MS = 15000;

const octopusLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Octopus WebSearch] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Octopus WebSearch] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Octopus WebSearch] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
}

export interface WebEnrichedData {
  additionalReviews: ReviewSummary[];
  priceInfo: PriceInfo | null;
  awards: string[];
  highlights: string[];
  warnings: string[];
  recentNews: NewsItem[];
  bookingSites: BookingSite[];
  socialMentions: SocialMention[];
  enrichedAt: Date;
}

export interface ReviewSummary {
  source: string;
  rating: number;
  reviewCount: number;
  summary: string;
  url?: string;
}

export interface PriceInfo {
  currency: string;
  priceRange: string;
  averagePrice?: number;
  priceComparison?: { site: string; price: string }[];
}

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface BookingSite {
  name: string;
  url: string;
  hasAvailability?: boolean;
}

export interface SocialMention {
  platform: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  count: number;
}

// WebEnrichedEntity combines EnrichedEntity with web search data
export type WebEnrichedEntity = EnrichedEntity & {
  webSearchData?: WebEnrichedData;
};

export interface WebEnrichmentResult {
  enrichedEntities: WebEnrichedEntity[];
  successCount: number;
  failedCount: number;
  processingTime: number;
}

export interface WebEnrichmentOptions {
  searchDepth?: 'quick' | 'standard' | 'thorough';
  includeReviews?: boolean;
  includePrices?: boolean;
  includeNews?: boolean;
  includeBookingSites?: boolean;
  maxSearches?: number;
}

const DEFAULT_OPTIONS: WebEnrichmentOptions = {
  searchDepth: 'standard',
  includeReviews: true,
  includePrices: true,
  includeNews: true,
  includeBookingSites: true,
  maxSearches: 3,
};

// ============================================================================
// Main Enrichment Function
// ============================================================================

/**
 * Enrich entities with web search data
 */
export async function enrichWithWebSearch(
  entities: EnrichedEntity[],
  destination: string,
  options: WebEnrichmentOptions = {}
): Promise<WebEnrichmentResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const enrichedEntities: WebEnrichedEntity[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Check if we have a search provider configured
  const hasSerperAPI = !!process.env.SERPER_API_KEY;
  const hasBraveAPI = !!process.env.BRAVE_SEARCH_API_KEY;

  if (!hasSerperAPI && !hasBraveAPI) {
    octopusLogger.warn('No web search API configured. Using AI-based enrichment only.');
  }

  // Process entities
  for (const entity of entities) {
    try {
      const webData = await enrichSingleEntityWithWeb(entity, destination, opts);

      if (webData) {
        enrichedEntities.push({
          ...entity,
          webSearchData: webData,
        });
        successCount++;
      } else {
        enrichedEntities.push({ ...entity } as WebEnrichedEntity);
      }
    } catch (error) {
      enrichedEntities.push({ ...entity } as WebEnrichedEntity);
      failedCount++;
      octopusLogger.error('Web enrichment failed for entity', { entity: entity.name, error });
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  octopusLogger.info('Web search enrichment complete', {
    total: entities.length,
    success: successCount,
    failed: failedCount,
    processingTime: Date.now() - startTime,
  });

  return {
    enrichedEntities,
    successCount,
    failedCount,
    processingTime: Date.now() - startTime,
  };
}

/**
 * Enrich single entity with web search
 */
async function enrichSingleEntityWithWeb(
  entity: EnrichedEntity,
  destination: string,
  options: WebEnrichmentOptions
): Promise<WebEnrichedData | null> {
  const searchQueries = buildSearchQueries(entity, destination, options);
  const searchResults: WebSearchResult[] = [];

  // Perform searches
  for (const query of searchQueries.slice(0, options.maxSearches || 3)) {
    const results = await performWebSearch(query);
    searchResults.push(...results);
  }

  if (searchResults.length === 0) {
    // Fall back to AI-based enrichment
    return await aiBasedEnrichment(entity, destination);
  }

  // Process search results with AI
  return await processSearchResultsWithAI(entity, searchResults, options);
}

/**
 * Build search queries for entity
 */
function buildSearchQueries(
  entity: EnrichedEntity,
  destination: string,
  options: WebEnrichmentOptions
): string[] {
  const queries: string[] = [];
  const name = entity.name;
  const location = entity.location?.city || destination;

  // Base query
  queries.push(`${name} ${location}`);

  // Type-specific queries
  if (entity.type === 'hotel') {
    if (options.includeReviews) {
      queries.push(`${name} ${location} reviews ratings`);
    }
    if (options.includePrices) {
      queries.push(`${name} ${location} room prices booking`);
    }
  } else if (entity.type === 'restaurant') {
    if (options.includeReviews) {
      queries.push(`${name} ${location} restaurant reviews`);
    }
    if (options.includePrices) {
      queries.push(`${name} ${location} menu prices`);
    }
  } else if (['attraction', 'museum', 'landmark'].includes(entity.type)) {
    queries.push(`${name} ${location} tickets prices hours`);
    if (options.includeReviews) {
      queries.push(`${name} ${location} visitor reviews tips`);
    }
  }

  return queries;
}

/**
 * Perform web search using available API
 */
async function performWebSearch(query: string): Promise<WebSearchResult[]> {
  // Try Serper first
  if (process.env.SERPER_API_KEY) {
    return await searchWithSerper(query);
  }

  // Try Brave Search
  if (process.env.BRAVE_SEARCH_API_KEY) {
    return await searchWithBrave(query);
  }

  return [];
}

/**
 * Search using Serper API
 */
async function searchWithSerper(query: string): Promise<WebSearchResult[]> {
  try {
    const response = await fetchWithTimeout('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10,
      }),
      timeoutMs: WEB_SEARCH_TIMEOUT_MS,
    });

    const data = await response.json();

    if (!data.organic) {
      return [];
    }

    return data.organic.map((result: any) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      source: new URL(result.link).hostname,
      publishedDate: result.date,
    }));
  } catch (error) {
    octopusLogger.error('Serper search failed', { query, error });
    return [];
  }
}

/**
 * Search using Brave Search API
 */
async function searchWithBrave(query: string): Promise<WebSearchResult[]> {
  try {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', '10');

    const response = await fetchWithTimeout(url.toString(), {
      headers: {
        'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY!,
        'Accept': 'application/json',
      },
      timeoutMs: WEB_SEARCH_TIMEOUT_MS,
    });

    const data = await response.json();

    if (!data.web?.results) {
      return [];
    }

    return data.web.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
      source: new URL(result.url).hostname,
      publishedDate: result.age,
    }));
  } catch (error) {
    octopusLogger.error('Brave search failed', { query, error });
    return [];
  }
}

/**
 * Process search results with AI to extract structured data
 */
async function processSearchResultsWithAI(
  entity: EnrichedEntity,
  searchResults: WebSearchResult[],
  options: WebEnrichmentOptions
): Promise<WebEnrichedData | null> {
  const providers = getAllUnifiedProviders();

  if (providers.length === 0) {
    return null;
  }

  const prompt = buildProcessingPrompt(entity, searchResults, options);

  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          { role: 'system', content: WEB_PROCESSING_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        maxTokens: 2000,
        responseFormat: { type: 'json_object' },
      });

      const parsed = JSON.parse(result.content);
      return parseWebEnrichmentResult(parsed);
    } catch (error) {
      octopusLogger.warn('AI processing failed', { provider: provider.name, error });
      continue;
    }
  }

  return null;
}

const WEB_PROCESSING_SYSTEM_PROMPT = `You are a travel research analyst extracting structured information from web search results.

Extract the following from the search results:
1. Reviews and ratings from different sources
2. Price information
3. Awards or recognitions
4. Key highlights mentioned
5. Any warnings or concerns
6. Recent news
7. Booking sites mentioned

Be accurate and only include information that is clearly stated in the search results.
Output valid JSON only.`;

function buildProcessingPrompt(
  entity: EnrichedEntity,
  searchResults: WebSearchResult[],
  options: WebEnrichmentOptions
): string {
  const resultsText = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\nSource: ${r.source}\n${r.snippet}`)
    .join('\n\n');

  return `Analyze these search results about "${entity.name}" (${entity.type}):

SEARCH RESULTS:
${resultsText}

Extract and structure:
${options.includeReviews ? '- Reviews and ratings from different sources' : ''}
${options.includePrices ? '- Price information' : ''}
- Awards or recognitions
- Key highlights
- Warnings or concerns
${options.includeNews ? '- Recent news (if any)' : ''}
${options.includeBookingSites ? '- Booking sites mentioned' : ''}

Respond with JSON:
{
  "additionalReviews": [
    { "source": "source name", "rating": 4.5, "reviewCount": 100, "summary": "brief summary", "url": "if available" }
  ],
  "priceInfo": {
    "currency": "USD/AED/etc",
    "priceRange": "$$ or price range",
    "averagePrice": 150,
    "priceComparison": [{ "site": "booking.com", "price": "$150" }]
  },
  "awards": ["award 1", "award 2"],
  "highlights": ["highlight 1", "highlight 2"],
  "warnings": ["any concerns mentioned"],
  "recentNews": [
    { "title": "news title", "source": "source", "date": "date", "sentiment": "positive/neutral/negative" }
  ],
  "bookingSites": [
    { "name": "Booking.com", "url": "url if found" }
  ]
}`;
}

function parseWebEnrichmentResult(data: any): WebEnrichedData {
  return {
    additionalReviews: (data.additionalReviews || []).map((r: any) => ({
      source: r.source || 'Unknown',
      rating: r.rating || 0,
      reviewCount: r.reviewCount || 0,
      summary: r.summary || '',
      url: r.url,
    })),
    priceInfo: data.priceInfo ? {
      currency: data.priceInfo.currency || 'USD',
      priceRange: data.priceInfo.priceRange || '',
      averagePrice: data.priceInfo.averagePrice,
      priceComparison: data.priceInfo.priceComparison,
    } : null,
    awards: data.awards || [],
    highlights: data.highlights || [],
    warnings: data.warnings || [],
    recentNews: (data.recentNews || []).map((n: any) => ({
      title: n.title || '',
      source: n.source || '',
      date: n.date || '',
      sentiment: n.sentiment || 'neutral',
    })),
    bookingSites: (data.bookingSites || []).map((b: any) => ({
      name: b.name || '',
      url: b.url || '',
    })),
    socialMentions: [],
    enrichedAt: new Date(),
  };
}

/**
 * AI-based enrichment when no search API is available
 */
async function aiBasedEnrichment(
  entity: EnrichedEntity,
  destination: string
): Promise<WebEnrichedData | null> {
  const providers = getAllUnifiedProviders();

  if (providers.length === 0) {
    return null;
  }

  const prompt = `Based on your knowledge, provide information about "${entity.name}" in ${destination}.
Type: ${entity.type}
${entity.description ? `Description: ${entity.description}` : ''}

Provide what you know about:
1. General reputation and ratings
2. Typical price range
3. Notable features or highlights
4. Any common concerns

Important: Only provide information you're confident about. Say "unknown" for anything uncertain.

Respond with JSON:
{
  "additionalReviews": [],
  "priceInfo": { "currency": "...", "priceRange": "..." },
  "awards": [],
  "highlights": [],
  "warnings": [],
  "recentNews": [],
  "bookingSites": []
}`;

  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          { role: 'system', content: 'You are a travel expert providing factual information about destinations and businesses. Be accurate and conservative - only state what you know.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        maxTokens: 1000,
        responseFormat: { type: 'json_object' },
      });

      const parsed = JSON.parse(result.content);
      return parseWebEnrichmentResult(parsed);
    } catch (error) {
      continue;
    }
  }

  return null;
}

/**
 * Check if web search is configured
 */
export function isWebSearchConfigured(): boolean {
  return !!(process.env.SERPER_API_KEY || process.env.BRAVE_SEARCH_API_KEY);
}

/**
 * Get web enrichment stats
 */
export function getWebEnrichmentStats(result: WebEnrichmentResult): {
  totalProcessed: number;
  enriched: number;
  withReviews: number;
  withPrices: number;
  withAwards: number;
} {
  const enriched = result.enrichedEntities.filter(e => e.webSearchData);

  return {
    totalProcessed: result.enrichedEntities.length,
    enriched: enriched.length,
    withReviews: enriched.filter(e => (e.webSearchData?.additionalReviews.length || 0) > 0).length,
    withPrices: enriched.filter(e => e.webSearchData?.priceInfo !== null).length,
    withAwards: enriched.filter(e => (e.webSearchData?.awards.length || 0) > 0).length,
  };
}
