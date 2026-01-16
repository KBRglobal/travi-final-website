/**
 * Octopus Engine - PAA Researcher
 * People Also Ask research using Serper API
 *
 * FAQ Distribution (from TRAVI guidelines):
 * - 40% from PAA (Serper) - Questions Google already shows
 * - 30% from document - Questions the content answers
 * - 30% AI generated - Only if missing
 */

import { log } from '../lib/logger';
import { fetchWithTimeout } from '../lib/fetch-with-timeout';

const SERPER_TIMEOUT_MS = 15000;

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[PAA Researcher] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[PAA Researcher] ${msg}`, undefined, data),
};

// ============================================================================
// Types
// ============================================================================

export interface SerperSearchResult {
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
  };
  organic: SerperOrganicResult[];
  peopleAlsoAsk?: SerperPAAResult[];
  relatedSearches?: SerperRelatedSearch[];
  answerBox?: SerperAnswerBox;
}

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SerperPAAResult {
  question: string;
  snippet: string;
  title?: string;
  link?: string;
}

export interface SerperRelatedSearch {
  query: string;
}

export interface SerperAnswerBox {
  snippet: string;
  title?: string;
  link?: string;
}

export interface PAAQuestion {
  question: string;
  answer?: string;
  source: 'serper' | 'autocomplete' | 'related';
  competitorUrl?: string;
  priority: number;
}

export interface KeywordResearch {
  mainKeyword: string;
  paaQuestions: PAAQuestion[];
  relatedSearches: string[];
  currentSnippet?: {
    text: string;
    url: string;
    format: 'paragraph' | 'list' | 'table';
  };
  searchVolume?: number;
}

// ============================================================================
// Serper API Client
// ============================================================================

const SERPER_API_URL = 'https://google.serper.dev/search';

/**
 * Check if Serper API is configured
 */
export function isSerperConfigured(): boolean {
  return !!process.env.SERPER_API_KEY;
}

/**
 * Make a Serper API request
 */
async function serperSearch(
  query: string,
  options: {
    gl?: string; // country code
    hl?: string; // language
    num?: number; // results count
  } = {}
): Promise<SerperSearchResult | null> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    logger.error('SERPER_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetchWithTimeout(SERPER_API_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: options.gl || 'us',
        hl: options.hl || 'en',
        num: options.num || 10,
      }),
      timeoutMs: SERPER_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json() as SerperSearchResult;
    return data;
  } catch (error) {
    logger.error('Serper search failed', { query, error: String(error) });
    return null;
  }
}

// ============================================================================
// PAA Research Functions
// ============================================================================

/**
 * Get People Also Ask questions for a keyword
 */
export async function getPAAQuestions(
  keyword: string,
  options: {
    language?: string;
    country?: string;
    maxQuestions?: number;
  } = {}
): Promise<PAAQuestion[]> {
  const questions: PAAQuestion[] = [];

  // Search Serper
  const result = await serperSearch(keyword, {
    gl: options.country,
    hl: options.language,
  });

  if (!result) {
    return questions;
  }

  // Extract PAA questions
  if (result.peopleAlsoAsk) {
    for (const paa of result.peopleAlsoAsk) {
      questions.push({
        question: paa.question,
        answer: paa.snippet,
        source: 'serper',
        competitorUrl: paa.link,
        priority: 1,
      });
    }
  }

  // Extract related searches as questions
  if (result.relatedSearches) {
    for (const related of result.relatedSearches) {
      // Only include if it looks like a question
      if (isQuestionFormat(related.query)) {
        questions.push({
          question: related.query,
          source: 'related',
          priority: 2,
        });
      }
    }
  }

  const maxQ = options.maxQuestions || 10;
  return questions.slice(0, maxQ);
}

/**
 * Research keywords for an entity
 */
export async function researchEntityKeywords(
  entityName: string,
  entityType: 'hotel' | 'restaurant' | 'attraction' | 'destination',
  destination: string,
  options: {
    language?: string;
    country?: string;
  } = {}
): Promise<KeywordResearch> {
  const mainKeyword = buildMainKeyword(entityName, entityType, destination);

  logger.info('Researching keywords', { entityName, entityType, mainKeyword });

  // Get PAA questions
  const paaQuestions = await getPAAQuestions(mainKeyword, options);

  // Search for current Featured Snippet
  const searchResult = await serperSearch(mainKeyword, {
    gl: options.country,
    hl: options.language,
  });

  let currentSnippet: KeywordResearch['currentSnippet'];
  if (searchResult?.answerBox) {
    currentSnippet = {
      text: searchResult.answerBox.snippet,
      url: searchResult.answerBox.link || '',
      format: detectSnippetFormat(searchResult.answerBox.snippet),
    };
  }

  // Get related searches
  const relatedSearches = searchResult?.relatedSearches?.map(r => r.query) || [];

  return {
    mainKeyword,
    paaQuestions,
    relatedSearches,
    currentSnippet,
  };
}

/**
 * Batch research for multiple entities
 */
export async function batchResearchKeywords(
  entities: {
    name: string;
    type: 'hotel' | 'restaurant' | 'attraction' | 'destination';
    destination: string;
  }[],
  options: {
    language?: string;
    country?: string;
    delayMs?: number;
  } = {}
): Promise<Map<string, KeywordResearch>> {
  const results = new Map<string, KeywordResearch>();
  const delay = options.delayMs || 500; // Rate limiting

  for (const entity of entities) {
    const research = await researchEntityKeywords(
      entity.name,
      entity.type,
      entity.destination,
      options
    );

    results.set(entity.name, research);

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  logger.info('Batch research complete', {
    entityCount: entities.length,
    totalQuestions: Array.from(results.values()).reduce(
      (sum, r) => sum + r.paaQuestions.length,
      0
    ),
  });

  return results;
}

// ============================================================================
// Question Generation Templates
// ============================================================================

/**
 * Generate common questions for an entity type (fallback when PAA fails)
 */
export function generateCommonQuestions(
  entityName: string,
  entityType: 'hotel' | 'restaurant' | 'attraction' | 'destination',
  destination: string
): PAAQuestion[] {
  const templates = getQuestionTemplates(entityType);

  return templates.map((template, index) => ({
    question: template
      .replace('{name}', entityName)
      .replace('{destination}', destination),
    source: 'related' as const,
    priority: 3 + index * 0.1,
  }));
}

function getQuestionTemplates(entityType: string): string[] {
  const templates: Record<string, string[]> = {
    hotel: [
      'Is {name} worth it?',
      'How much does {name} cost per night?',
      'What is the best room at {name}?',
      'Does {name} have a pool?',
      'Is {name} good for families?',
      'What is check-in time at {name}?',
      'Does {name} include breakfast?',
      'How far is {name} from the airport?',
      'Is {name} near public transport?',
      'What restaurants are near {name}?',
    ],
    restaurant: [
      'Is {name} worth it?',
      'How much does {name} cost?',
      'Does {name} require reservations?',
      'What is the dress code at {name}?',
      'What is the best dish at {name}?',
      'Does {name} have vegetarian options?',
      'Is {name} good for groups?',
      'What are {name} opening hours?',
      'Does {name} have outdoor seating?',
      'Is {name} kid-friendly?',
    ],
    attraction: [
      'Is {name} worth visiting?',
      'How much is {name} entrance fee?',
      'How long does {name} take?',
      'What is the best time to visit {name}?',
      'Is {name} good for kids?',
      'Is {name} free?',
      'What to wear at {name}?',
      'Can you take photos at {name}?',
      'How to get to {name}?',
      'Is {name} crowded?',
    ],
    destination: [
      'Is {name} safe for tourists?',
      'What is the best time to visit {name}?',
      'How many days do you need in {name}?',
      'What is {name} famous for?',
      'Is {name} expensive?',
      'What language do they speak in {name}?',
      'What currency is used in {name}?',
      'What to pack for {name}?',
      'Is {name} good for solo travelers?',
      'What food is {name} known for?',
    ],
  };

  return templates[entityType] || templates.destination;
}

// ============================================================================
// Featured Snippet Analysis
// ============================================================================

/**
 * Analyze current Featured Snippet for a keyword
 */
export async function analyzeCompetitorSnippet(
  keyword: string,
  options: {
    language?: string;
    country?: string;
  } = {}
): Promise<{
  hasSnippet: boolean;
  snippet?: {
    text: string;
    url: string;
    format: 'paragraph' | 'list' | 'table';
    wordCount: number;
  };
  recommendations: string[];
}> {
  const result = await serperSearch(keyword, {
    gl: options.country,
    hl: options.language,
  });

  if (!result?.answerBox) {
    return {
      hasSnippet: false,
      recommendations: [
        'No Featured Snippet exists - opportunity to be first',
        'Create clear, concise answer (40-60 words)',
        'Use question as H2 heading',
        'Provide direct answer in first paragraph',
      ],
    };
  }

  const snippet = result.answerBox;
  const format = detectSnippetFormat(snippet.snippet);
  const wordCount = snippet.snippet.split(/\s+/).length;

  const recommendations: string[] = [];

  // Analyze and provide recommendations
  if (format === 'paragraph' && wordCount > 60) {
    recommendations.push('Current snippet is long - aim for 40-60 words');
  }

  if (format === 'paragraph') {
    recommendations.push('Consider using bullet points or numbered list');
  }

  if (format === 'list') {
    recommendations.push('Match list format with clearer items');
  }

  recommendations.push(`Current snippet from: ${snippet.link || 'unknown'}`);
  recommendations.push(`Word count to beat: ${wordCount}`);

  return {
    hasSnippet: true,
    snippet: {
      text: snippet.snippet,
      url: snippet.link || '',
      format,
      wordCount,
    },
    recommendations,
  };
}

// ============================================================================
// Combined Research
// ============================================================================

export interface FullKeywordResearch {
  mainKeyword: string;
  paaQuestions: PAAQuestion[];
  relatedSearches: string[];
  snippetAnalysis: {
    hasCompetitor: boolean;
    competitorFormat?: string;
    recommendations: string[];
  };
  suggestedFAQs: {
    question: string;
    source: string;
    priority: number;
  }[];
  estimatedDifficulty: 'low' | 'medium' | 'high';
}

/**
 * Perform full keyword research for content optimization
 */
export async function performFullKeywordResearch(
  entityName: string,
  entityType: 'hotel' | 'restaurant' | 'attraction' | 'destination',
  destination: string,
  options: {
    language?: string;
    country?: string;
  } = {}
): Promise<FullKeywordResearch> {
  const mainKeyword = buildMainKeyword(entityName, entityType, destination);

  // Get PAA questions
  const paaQuestions = await getPAAQuestions(mainKeyword, options);

  // Analyze competitor snippet
  const snippetAnalysis = await analyzeCompetitorSnippet(mainKeyword, options);

  // Get related searches
  const result = await serperSearch(mainKeyword, {
    gl: options.country,
    hl: options.language,
  });
  const relatedSearches = result?.relatedSearches?.map(r => r.query) || [];

  // Generate fallback questions if PAA is empty
  let suggestedFAQs = paaQuestions.map(q => ({
    question: q.question,
    source: q.source,
    priority: q.priority,
  }));

  if (suggestedFAQs.length < 5) {
    const commonQuestions = generateCommonQuestions(entityName, entityType, destination);
    suggestedFAQs = [
      ...suggestedFAQs,
      ...commonQuestions.slice(0, 10 - suggestedFAQs.length).map(q => ({
        question: q.question,
        source: q.source, // 'related' from generateCommonQuestions
        priority: q.priority,
      })),
    ];
  }

  // Estimate difficulty
  let estimatedDifficulty: 'low' | 'medium' | 'high' = 'low';
  if (snippetAnalysis.hasSnippet) {
    estimatedDifficulty = 'medium';
  }
  if (result?.organic && result.organic[0]?.link?.includes('tripadvisor')) {
    estimatedDifficulty = 'high';
  }

  return {
    mainKeyword,
    paaQuestions,
    relatedSearches,
    snippetAnalysis: {
      hasCompetitor: snippetAnalysis.hasSnippet,
      competitorFormat: snippetAnalysis.snippet?.format,
      recommendations: snippetAnalysis.recommendations,
    },
    suggestedFAQs,
    estimatedDifficulty,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildMainKeyword(
  entityName: string,
  entityType: string,
  destination: string
): string {
  // Build search-friendly keyword
  const typeKeywords: Record<string, string> = {
    hotel: 'hotel',
    restaurant: 'restaurant',
    attraction: '',
    destination: '',
  };

  const typeWord = typeKeywords[entityType] || '';

  if (entityType === 'destination') {
    return destination;
  }

  return `${entityName} ${typeWord} ${destination}`.trim();
}

function isQuestionFormat(text: string): boolean {
  const questionWords = [
    'what', 'how', 'when', 'where', 'why', 'is', 'are', 'does', 'do', 'can', 'should',
    'מה', 'איך', 'מתי', 'איפה', 'למה', 'האם', 'כמה',
  ];

  const lowerText = text.toLowerCase();
  return questionWords.some(word => lowerText.startsWith(word)) || text.includes('?');
}

function detectSnippetFormat(text: string): 'paragraph' | 'list' | 'table' {
  // Check for list indicators
  if (/^[\d•\-\*]|^\s*[\d•\-\*]/m.test(text)) {
    return 'list';
  }

  // Check for table indicators
  if (text.includes('|') || /\t.*\t/.test(text)) {
    return 'table';
  }

  return 'paragraph';
}

// ============================================================================
// Statistics
// ============================================================================

export function getPAAResearchStats(
  results: Map<string, KeywordResearch>
): {
  totalEntities: number;
  totalQuestions: number;
  avgQuestionsPerEntity: number;
  entitiesWithSnippets: number;
  questionsBySource: Record<string, number>;
} {
  const allResults = Array.from(results.values());

  let totalQuestions = 0;
  let entitiesWithSnippets = 0;
  const questionsBySource: Record<string, number> = {};

  for (const result of allResults) {
    totalQuestions += result.paaQuestions.length;

    if (result.currentSnippet) {
      entitiesWithSnippets++;
    }

    for (const q of result.paaQuestions) {
      questionsBySource[q.source] = (questionsBySource[q.source] || 0) + 1;
    }
  }

  return {
    totalEntities: allResults.length,
    totalQuestions,
    avgQuestionsPerEntity: totalQuestions / allResults.length,
    entitiesWithSnippets,
    questionsBySource,
  };
}
