/**
 * Octopus Engine - Article Generators
 * Generates listicles, comparisons, guides, and other article types
 * Uses enriched entities and content pages as source material
 */

import { getAllUnifiedProviders } from '../ai/providers';
import { log } from '../lib/logger';
import type { WebEnrichedEntity } from './web-search-enricher';
import type { GeneratedPage } from './content-generators';

// Use internal content block type that matches our generation format
interface ContentBlock {
  id: string;
  type: string;
  content?: string;
  items?: string[];
  heading?: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const octopusLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Octopus Articles] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Octopus Articles] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Octopus Articles] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export type ArticleType =
  | 'listicle'           // "Top 10 Hotels in Dubai"
  | 'comparison'         // "X vs Y: Which is Better?"
  | 'guide'              // "Complete Guide to Dubai Marina"
  | 'itinerary'          // "3 Days in Dubai Itinerary"
  | 'seasonal'           // "Best Things to Do in Dubai in Winter"
  | 'budget'             // "Budget Travel Guide to Dubai"
  | 'luxury'             // "Luxury Experiences in Dubai"
  | 'family'             // "Family-Friendly Dubai"
  | 'neighborhood'       // "Dubai Marina Neighborhood Guide"
  | 'food'               // "Where to Eat in Dubai"
  | 'activities';        // "Adventure Activities in Dubai"

export interface GeneratedArticle {
  id: string;
  type: ArticleType;
  content: ArticleContent;
  metadata: ArticleMetadata;
  seoData: ArticleSEO;
  aeoData: ArticleAEO;
  sourceEntities: string[];
  generatedAt: Date;
  processingTime: number;
}

export interface ArticleContent {
  title: string;
  subtitle?: string;
  introduction: string;
  blocks: ContentBlock[];
  conclusion: string;
  faq: FaqItem[];
  callToAction?: string;
  relatedArticles: string[];
}

export interface ArticleMetadata {
  slug: string;
  status: 'draft' | 'ready' | 'published';
  locale: string;
  destination: string;
  category: string;
  tags: string[];
  estimatedReadTime: number;
  wordCount: number;
}

export interface ArticleSEO {
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  headings: { level: number; text: string }[];
}

export interface ArticleAEO {
  answerCapsule: string;
  quickAnswer: string;
  keyTakeaways: string[];
  listSummary?: string[];
}

export interface ArticleGenerationOptions {
  locale?: string;
  tone?: 'professional' | 'friendly' | 'conversational' | 'luxury' | 'casual';
  wordCount?: 'short' | 'medium' | 'long'; // 800, 1500, 2500+
  includeImages?: boolean;
  includeAEO?: boolean;
}

export interface ArticleTemplate {
  type: ArticleType;
  titlePattern: string;
  requiredEntityTypes: string[];
  minEntities: number;
  maxEntities: number;
  sections: string[];
}

const DEFAULT_OPTIONS: ArticleGenerationOptions = {
  locale: 'en',
  tone: 'friendly',
  wordCount: 'medium',
  includeImages: true,
  includeAEO: true,
};

// ============================================================================
// Article Templates
// ============================================================================

const ARTICLE_TEMPLATES: ArticleTemplate[] = [
  {
    type: 'listicle',
    titlePattern: 'Top {count} {entityType}s in {destination}',
    requiredEntityTypes: ['hotel', 'restaurant', 'attraction'],
    minEntities: 5,
    maxEntities: 15,
    sections: ['introduction', 'numbered_list', 'tips', 'conclusion', 'faq'],
  },
  {
    type: 'comparison',
    titlePattern: '{entity1} vs {entity2}: Which is Better?',
    requiredEntityTypes: ['hotel', 'restaurant'],
    minEntities: 2,
    maxEntities: 2,
    sections: ['introduction', 'overview', 'comparison_table', 'detailed_comparison', 'verdict', 'faq'],
  },
  {
    type: 'guide',
    titlePattern: 'Complete Guide to {topic} in {destination}',
    requiredEntityTypes: ['hotel', 'restaurant', 'attraction', 'neighborhood'],
    minEntities: 3,
    maxEntities: 20,
    sections: ['introduction', 'overview', 'what_to_do', 'where_to_stay', 'where_to_eat', 'tips', 'conclusion', 'faq'],
  },
  {
    type: 'itinerary',
    titlePattern: '{days} Days in {destination}: Perfect Itinerary',
    requiredEntityTypes: ['attraction', 'restaurant'],
    minEntities: 5,
    maxEntities: 20,
    sections: ['introduction', 'day_by_day', 'map', 'budget', 'tips', 'faq'],
  },
  {
    type: 'budget',
    titlePattern: 'Budget Guide to {destination}: How to Save Money',
    requiredEntityTypes: ['hotel', 'restaurant', 'attraction'],
    minEntities: 5,
    maxEntities: 15,
    sections: ['introduction', 'accommodation', 'food', 'activities', 'transport', 'tips', 'budget_breakdown', 'faq'],
  },
  {
    type: 'family',
    titlePattern: '{destination} with Kids: Family Travel Guide',
    requiredEntityTypes: ['hotel', 'attraction'],
    minEntities: 5,
    maxEntities: 15,
    sections: ['introduction', 'family_hotels', 'kid_friendly_activities', 'restaurants', 'tips', 'packing', 'faq'],
  },
  {
    type: 'food',
    titlePattern: 'Where to Eat in {destination}: Best Restaurants Guide',
    requiredEntityTypes: ['restaurant'],
    minEntities: 5,
    maxEntities: 20,
    sections: ['introduction', 'by_cuisine', 'by_budget', 'by_neighborhood', 'food_tips', 'faq'],
  },
];

// ============================================================================
// Main Generation Functions
// ============================================================================

/**
 * Generate all possible articles from entities
 */
export async function generateAllArticles(
  entities: WebEnrichedEntity[],
  pages: GeneratedPage[],
  destination: string,
  options: ArticleGenerationOptions = {}
): Promise<GeneratedArticle[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const articles: GeneratedArticle[] = [];

  // Group entities by type
  const entityGroups = groupEntitiesByType(entities);

  // Generate listicles for each entity type with enough entities
  for (const [type, typeEntities] of Object.entries(entityGroups)) {
    if (typeEntities.length >= 5) {
      const listicle = await generateListicle(typeEntities, destination, type, opts);
      if (listicle) articles.push(listicle);
    }
  }

  // Generate comparisons for top hotels
  const hotels = entityGroups['hotel'] || [];
  if (hotels.length >= 2) {
    const topHotels = hotels.slice(0, 4);
    for (let i = 0; i < topHotels.length - 1; i += 2) {
      const comparison = await generateComparison(
        [topHotels[i], topHotels[i + 1]],
        destination,
        opts
      );
      if (comparison) articles.push(comparison);
    }
  }

  // Generate neighborhood guides
  const neighborhoods = entityGroups['neighborhood'] || [];
  for (const neighborhood of neighborhoods.slice(0, 5)) {
    const neighborhoodEntities = findEntitiesInNeighborhood(
      entities,
      neighborhood.name
    );
    if (neighborhoodEntities.length >= 3) {
      const guide = await generateNeighborhoodGuide(
        neighborhood,
        neighborhoodEntities,
        destination,
        opts
      );
      if (guide) articles.push(guide);
    }
  }

  // Generate comprehensive destination guide
  if (entities.length >= 10) {
    const destGuide = await generateDestinationGuide(entities, destination, opts);
    if (destGuide) articles.push(destGuide);
  }

  // Generate food guide if enough restaurants
  const restaurants = entityGroups['restaurant'] || [];
  if (restaurants.length >= 5) {
    const foodGuide = await generateFoodGuide(restaurants, destination, opts);
    if (foodGuide) articles.push(foodGuide);
  }

  // Generate itinerary
  if (entities.length >= 10) {
    const itinerary = await generateItinerary(entities, destination, 3, opts);
    if (itinerary) articles.push(itinerary);
  }

  octopusLogger.info('Article generation complete', {
    totalArticles: articles.length,
    types: articles.map(a => a.type),
  });

  return articles;
}

// ============================================================================
// Listicle Generator
// ============================================================================

/**
 * Generate a listicle article
 */
export async function generateListicle(
  entities: WebEnrichedEntity[],
  destination: string,
  entityType: string,
  options: ArticleGenerationOptions = {}
): Promise<GeneratedArticle | null> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const providers = getAllUnifiedProviders();
  if (providers.length === 0) {
    throw new Error('No AI provider available');
  }

  // Sort entities by rating/confidence
  const sortedEntities = [...entities]
    .sort((a, b) => {
      const ratingA = a.googleMapsData?.rating || 0;
      const ratingB = b.googleMapsData?.rating || 0;
      return ratingB - ratingA;
    })
    .slice(0, 10);

  const count = sortedEntities.length;
  const typePlural = getTypePlural(entityType);

  const prompt = buildListiclePrompt(sortedEntities, destination, typePlural, opts);

  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          { role: 'system', content: LISTICLE_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 6000,
        responseFormat: { type: 'json_object' },
      });

      const parsed = JSON.parse(result.content);
      const article = parseListicleResult(
        parsed,
        sortedEntities,
        destination,
        entityType,
        opts
      );
      article.processingTime = Date.now() - startTime;

      octopusLogger.info('Listicle generated', {
        title: article.content.title,
        items: count,
        processingTime: article.processingTime,
      });

      return article;
    } catch (error) {
      octopusLogger.warn('Listicle generation failed with provider', { provider: provider.name, error });
      continue;
    }
  }

  return null;
}

const LISTICLE_SYSTEM_PROMPT = `You are an expert travel content writer creating engaging listicle articles.

Your listicles should:
- Have an attention-grabbing introduction
- Present each item with compelling descriptions
- Include practical information (prices, location, tips)
- Be SEO and AEO optimized
- End with a helpful conclusion and FAQs

Output valid JSON only.`;

function buildListiclePrompt(
  entities: WebEnrichedEntity[],
  destination: string,
  typePlural: string,
  options: ArticleGenerationOptions
): string {
  const entityData = entities.map((e, i) => ({
    rank: i + 1,
    name: e.name,
    description: e.description,
    rating: e.googleMapsData?.rating,
    reviewCount: e.googleMapsData?.reviewCount,
    priceLevel: e.googleMapsData?.priceLevel,
    highlights: e.webSearchData?.highlights,
  }));

  const wordTarget = options.wordCount === 'short' ? 800 : options.wordCount === 'long' ? 2500 : 1500;

  return `Create a listicle article: "Top ${entities.length} ${typePlural} in ${destination}"

ENTITIES DATA:
${JSON.stringify(entityData, null, 2)}

REQUIREMENTS:
- Tone: ${options.tone}
- Target word count: ~${wordTarget} words
- Include for each item: description, why it's great, practical tips
- Write compelling introduction and conclusion
- Include 5 FAQs
- Create answer capsule for AI engines

Response JSON:
{
  "title": "Top ${entities.length} ${typePlural} in ${destination}",
  "subtitle": "Engaging subtitle",
  "metaTitle": "SEO title (50-60 chars)",
  "metaDescription": "Meta description (150-160 chars)",
  "primaryKeyword": "main keyword",
  "secondaryKeywords": [],
  "introduction": "Engaging intro paragraph...",
  "items": [
    {
      "rank": 1,
      "name": "Entity Name",
      "description": "Why it's great...",
      "highlights": ["highlight 1", "highlight 2"],
      "tips": "Practical tip",
      "priceInfo": "$$/night or meal price",
      "bestFor": "Best for couples/families/etc"
    }
  ],
  "tips": ["General tip 1", "General tip 2"],
  "conclusion": "Concluding paragraph...",
  "faq": [
    { "question": "...", "answer": "..." }
  ],
  "answerCapsule": "40-60 word summary with key facts",
  "quickAnswer": "One sentence answer",
  "keyTakeaways": ["takeaway 1", "takeaway 2"]
}`;
}

function parseListicleResult(
  data: any,
  entities: WebEnrichedEntity[],
  destination: string,
  entityType: string,
  options: ArticleGenerationOptions
): GeneratedArticle {
  const articleId = `listicle_${entityType}_${destination.toLowerCase().replace(/\s+/g, '-')}_${Date.now().toString(36)}`;

  // Build content blocks from items
  const blocks: ContentBlock[] = [
    { id: 'intro', type: 'text', content: data.introduction },
  ];

  for (const item of data.items || []) {
    blocks.push({
      id: `item_${item.rank}`,
      type: 'heading',
      content: `${item.rank}. ${item.name}`,
    } as ContentBlock);

    blocks.push({
      id: `item_${item.rank}_desc`,
      type: 'text',
      content: item.description,
    } as ContentBlock);

    if (item.highlights && item.highlights.length > 0) {
      blocks.push({
        id: `item_${item.rank}_highlights`,
        type: 'bullets',
        items: item.highlights,
      } as ContentBlock);
    }

    if (item.tips) {
      blocks.push({
        id: `item_${item.rank}_tip`,
        type: 'tip',
        content: item.tips,
      } as ContentBlock);
    }
  }

  if (data.tips && data.tips.length > 0) {
    blocks.push({
      id: 'tips_section',
      type: 'heading',
      content: 'Tips for Your Visit',
    } as ContentBlock);

    blocks.push({
      id: 'tips_list',
      type: 'bullets',
      items: data.tips,
    } as ContentBlock);
  }

  blocks.push({
    id: 'conclusion',
    type: 'text',
    content: data.conclusion,
  } as ContentBlock);

  const wordCount = estimateWordCount(blocks);

  return {
    id: articleId,
    type: 'listicle',
    content: {
      title: data.title,
      subtitle: data.subtitle,
      introduction: data.introduction,
      blocks,
      conclusion: data.conclusion,
      faq: parseFaq(data.faq || []),
      relatedArticles: [],
    },
    metadata: {
      slug: generateSlug(data.title),
      status: 'draft',
      locale: options.locale || 'en',
      destination,
      category: entityType,
      tags: data.secondaryKeywords || [],
      estimatedReadTime: Math.ceil(wordCount / 200),
      wordCount,
    },
    seoData: {
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription,
      primaryKeyword: data.primaryKeyword,
      secondaryKeywords: data.secondaryKeywords || [],
      headings: extractHeadings(blocks),
    },
    aeoData: {
      answerCapsule: data.answerCapsule || '',
      quickAnswer: data.quickAnswer || '',
      keyTakeaways: data.keyTakeaways || [],
      listSummary: (data.items || []).map((i: any) => `${i.rank}. ${i.name}`),
    },
    sourceEntities: entities.map(e => e.id),
    generatedAt: new Date(),
    processingTime: 0,
  };
}

// ============================================================================
// Comparison Generator
// ============================================================================

/**
 * Generate a comparison article
 */
export async function generateComparison(
  entities: [WebEnrichedEntity, WebEnrichedEntity],
  destination: string,
  options: ArticleGenerationOptions = {}
): Promise<GeneratedArticle | null> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const providers = getAllUnifiedProviders();
  if (providers.length === 0) {
    throw new Error('No AI provider available');
  }

  const prompt = buildComparisonPrompt(entities, destination, opts);

  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          { role: 'system', content: COMPARISON_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 5000,
        responseFormat: { type: 'json_object' },
      });

      const parsed = JSON.parse(result.content);
      const article = parseComparisonResult(parsed, entities, destination, opts);
      article.processingTime = Date.now() - startTime;

      return article;
    } catch (error) {
      octopusLogger.warn('Comparison generation failed', { error });
      continue;
    }
  }

  return null;
}

const COMPARISON_SYSTEM_PROMPT = `You are an expert travel writer creating detailed comparison articles.

Your comparisons should:
- Be fair and balanced
- Highlight unique strengths of each option
- Include practical comparison criteria
- Help readers make informed decisions
- Be SEO and AEO optimized

Output valid JSON only.`;

function buildComparisonPrompt(
  entities: [WebEnrichedEntity, WebEnrichedEntity],
  destination: string,
  options: ArticleGenerationOptions
): string {
  return `Create a comparison article: "${entities[0].name} vs ${entities[1].name}"

ENTITY 1:
${JSON.stringify({
  name: entities[0].name,
  description: entities[0].description,
  rating: entities[0].googleMapsData?.rating,
  reviewCount: entities[0].googleMapsData?.reviewCount,
  highlights: entities[0].webSearchData?.highlights,
  priceInfo: entities[0].webSearchData?.priceInfo,
}, null, 2)}

ENTITY 2:
${JSON.stringify({
  name: entities[1].name,
  description: entities[1].description,
  rating: entities[1].googleMapsData?.rating,
  reviewCount: entities[1].googleMapsData?.reviewCount,
  highlights: entities[1].webSearchData?.highlights,
  priceInfo: entities[1].webSearchData?.priceInfo,
}, null, 2)}

DESTINATION: ${destination}
TONE: ${options.tone}

Response JSON:
{
  "title": "${entities[0].name} vs ${entities[1].name}: Which is Better?",
  "subtitle": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "primaryKeyword": "...",
  "secondaryKeywords": [],
  "introduction": "...",
  "overviewEntity1": "...",
  "overviewEntity2": "...",
  "comparisonCriteria": [
    { "criterion": "Location", "entity1": "...", "entity2": "...", "winner": "entity1|entity2|tie" }
  ],
  "entity1Pros": ["...", "..."],
  "entity1Cons": ["...", "..."],
  "entity2Pros": ["...", "..."],
  "entity2Cons": ["...", "..."],
  "verdict": "...",
  "bestFor": {
    "entity1": "Best for...",
    "entity2": "Best for..."
  },
  "faq": [],
  "answerCapsule": "...",
  "quickAnswer": "..."
}`;
}

function parseComparisonResult(
  data: any,
  entities: [WebEnrichedEntity, WebEnrichedEntity],
  destination: string,
  options: ArticleGenerationOptions
): GeneratedArticle {
  const articleId = `comparison_${entities[0].id}_${entities[1].id}_${Date.now().toString(36)}`;

  const blocks: ContentBlock[] = [
    { id: 'intro', type: 'text', content: data.introduction },
    { id: 'overview_h2', type: 'heading', content: 'Overview' },
    { id: 'overview_1_h3', type: 'heading', content: entities[0].name },
    { id: 'overview_1', type: 'text', content: data.overviewEntity1 },
    { id: 'overview_2_h3', type: 'heading', content: entities[1].name },
    { id: 'overview_2', type: 'text', content: data.overviewEntity2 },
    { id: 'comparison_h2', type: 'heading', content: 'Detailed Comparison' },
  ];

  // Add comparison table (as structured content)
  if (data.comparisonCriteria) {
    blocks.push({
      id: 'comparison_table',
      type: 'table' as any,
      content: JSON.stringify(data.comparisonCriteria),
    } as ContentBlock);
  }

  // Add pros/cons
  blocks.push(
    { id: 'pros_cons_h2', type: 'heading', content: 'Pros and Cons' },
    { id: 'e1_pros_h3', type: 'heading', content: `${entities[0].name} - Pros` },
    { id: 'e1_pros', type: 'bullets', items: data.entity1Pros || [] } as ContentBlock,
    { id: 'e1_cons_h3', type: 'heading', content: `${entities[0].name} - Cons` },
    { id: 'e1_cons', type: 'bullets', items: data.entity1Cons || [] } as ContentBlock,
    { id: 'e2_pros_h3', type: 'heading', content: `${entities[1].name} - Pros` },
    { id: 'e2_pros', type: 'bullets', items: data.entity2Pros || [] } as ContentBlock,
    { id: 'e2_cons_h3', type: 'heading', content: `${entities[1].name} - Cons` },
    { id: 'e2_cons', type: 'bullets', items: data.entity2Cons || [] } as ContentBlock,
    { id: 'verdict_h2', type: 'heading', content: 'The Verdict' },
    { id: 'verdict', type: 'text', content: data.verdict },
  );

  const wordCount = estimateWordCount(blocks);

  return {
    id: articleId,
    type: 'comparison',
    content: {
      title: data.title,
      subtitle: data.subtitle,
      introduction: data.introduction,
      blocks,
      conclusion: data.verdict,
      faq: parseFaq(data.faq || []),
      relatedArticles: [],
    },
    metadata: {
      slug: generateSlug(data.title),
      status: 'draft',
      locale: options.locale || 'en',
      destination,
      category: 'comparisons',
      tags: data.secondaryKeywords || [],
      estimatedReadTime: Math.ceil(wordCount / 200),
      wordCount,
    },
    seoData: {
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription,
      primaryKeyword: data.primaryKeyword,
      secondaryKeywords: data.secondaryKeywords || [],
      headings: extractHeadings(blocks),
    },
    aeoData: {
      answerCapsule: data.answerCapsule || '',
      quickAnswer: data.quickAnswer || '',
      keyTakeaways: [
        data.bestFor?.entity1 || '',
        data.bestFor?.entity2 || '',
      ].filter(Boolean),
    },
    sourceEntities: entities.map(e => e.id),
    generatedAt: new Date(),
    processingTime: 0,
  };
}

// ============================================================================
// Guide Generators
// ============================================================================

/**
 * Generate neighborhood guide
 */
export async function generateNeighborhoodGuide(
  neighborhood: WebEnrichedEntity,
  nearbyEntities: WebEnrichedEntity[],
  destination: string,
  options: ArticleGenerationOptions = {}
): Promise<GeneratedArticle | null> {
  const startTime = Date.now();
  const providers = getAllUnifiedProviders();

  if (providers.length === 0) return null;

  const prompt = `Create a neighborhood guide for "${neighborhood.name}" in ${destination}.

NEIGHBORHOOD:
${JSON.stringify({
  name: neighborhood.name,
  description: neighborhood.description,
  characteristics: (neighborhood as any).characteristics,
  atmosphere: (neighborhood as any).atmosphere,
}, null, 2)}

NEARBY PLACES:
${JSON.stringify(nearbyEntities.map(e => ({
  name: e.name,
  type: e.type,
  rating: e.googleMapsData?.rating,
})), null, 2)}

Generate a comprehensive neighborhood guide with:
- Introduction
- What makes this neighborhood special
- Top things to do
- Where to eat
- Where to stay
- Getting around
- Tips
- FAQ

Response JSON with title, metaTitle, metaDescription, sections, faq, answerCapsule, etc.`;

  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          { role: 'system', content: 'You are an expert travel writer creating neighborhood guides. Output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 5000,
        responseFormat: { type: 'json_object' },
      });

      const parsed = JSON.parse(result.content);
      return parseGuideResult(parsed, 'neighborhood', [neighborhood, ...nearbyEntities], destination, options, startTime);
    } catch (error) {
      continue;
    }
  }

  return null;
}

/**
 * Generate destination guide
 */
export async function generateDestinationGuide(
  entities: WebEnrichedEntity[],
  destination: string,
  options: ArticleGenerationOptions = {}
): Promise<GeneratedArticle | null> {
  const startTime = Date.now();
  const providers = getAllUnifiedProviders();

  if (providers.length === 0) return null;

  const groupedEntities = groupEntitiesByType(entities);

  const prompt = `Create a comprehensive destination guide for ${destination}.

AVAILABLE CONTENT:
- Hotels: ${(groupedEntities['hotel'] || []).length}
- Restaurants: ${(groupedEntities['restaurant'] || []).length}
- Attractions: ${(groupedEntities['attraction'] || []).length}
- Neighborhoods: ${(groupedEntities['neighborhood'] || []).length}

TOP HIGHLIGHTS:
${JSON.stringify(entities.slice(0, 15).map(e => ({
  name: e.name,
  type: e.type,
  rating: e.googleMapsData?.rating,
})), null, 2)}

Generate a complete guide with:
- Introduction to ${destination}
- Best time to visit
- Top things to do
- Where to stay
- Where to eat
- Getting around
- Practical tips
- FAQ

Response JSON with all sections.`;

  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          { role: 'system', content: 'You are an expert travel writer creating destination guides. Output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 6000,
        responseFormat: { type: 'json_object' },
      });

      const parsed = JSON.parse(result.content);
      return parseGuideResult(parsed, 'guide', entities, destination, options, startTime);
    } catch (error) {
      continue;
    }
  }

  return null;
}

/**
 * Generate food guide
 */
export async function generateFoodGuide(
  restaurants: WebEnrichedEntity[],
  destination: string,
  options: ArticleGenerationOptions = {}
): Promise<GeneratedArticle | null> {
  const startTime = Date.now();
  const providers = getAllUnifiedProviders();

  if (providers.length === 0) return null;

  const prompt = `Create a food guide for ${destination}.

RESTAURANTS:
${JSON.stringify(restaurants.slice(0, 15).map(r => ({
  name: r.name,
  cuisine: (r as any).cuisineType,
  priceRange: (r as any).priceRange,
  rating: r.googleMapsData?.rating,
  highlights: r.webSearchData?.highlights?.slice(0, 2),
})), null, 2)}

Generate a comprehensive food guide with:
- Introduction to ${destination}'s food scene
- Best restaurants by cuisine
- Best restaurants by budget
- Local specialties to try
- Food tips
- FAQ

Response JSON with title, metaTitle, metaDescription, sections, faq, answerCapsule, etc.`;

  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          { role: 'system', content: 'You are an expert food and travel writer. Output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 5000,
        responseFormat: { type: 'json_object' },
      });

      const parsed = JSON.parse(result.content);
      return parseGuideResult(parsed, 'food', restaurants, destination, options, startTime);
    } catch (error) {
      continue;
    }
  }

  return null;
}

/**
 * Generate itinerary
 */
export async function generateItinerary(
  entities: WebEnrichedEntity[],
  destination: string,
  days: number,
  options: ArticleGenerationOptions = {}
): Promise<GeneratedArticle | null> {
  const startTime = Date.now();
  const providers = getAllUnifiedProviders();

  if (providers.length === 0) return null;

  const attractions = entities.filter(e => ['attraction', 'museum', 'landmark', 'beach', 'mall'].includes(e.type));
  const restaurants = entities.filter(e => e.type === 'restaurant');

  const prompt = `Create a ${days}-day itinerary for ${destination}.

ATTRACTIONS:
${JSON.stringify(attractions.slice(0, 12).map(a => ({
  name: a.name,
  type: a.type,
  rating: a.googleMapsData?.rating,
  duration: (a as any).duration,
})), null, 2)}

RESTAURANTS:
${JSON.stringify(restaurants.slice(0, 8).map(r => ({
  name: r.name,
  cuisine: (r as any).cuisineType,
  priceRange: (r as any).priceRange,
})), null, 2)}

Generate a detailed ${days}-day itinerary with:
- Day-by-day schedule
- Morning, afternoon, evening activities
- Restaurant recommendations for each day
- Timing and logistics
- Budget estimates
- Tips for each day

Response JSON with title, metaTitle, metaDescription, dayByDay array, budget, tips, faq, answerCapsule.`;

  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          { role: 'system', content: 'You are an expert travel planner creating detailed itineraries. Output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 6000,
        responseFormat: { type: 'json_object' },
      });

      const parsed = JSON.parse(result.content);
      return parseItineraryResult(parsed, entities, destination, days, options, startTime);
    } catch (error) {
      continue;
    }
  }

  return null;
}

// ============================================================================
// Result Parsers
// ============================================================================

function parseGuideResult(
  data: any,
  type: ArticleType,
  entities: WebEnrichedEntity[],
  destination: string,
  options: ArticleGenerationOptions,
  startTime: number
): GeneratedArticle {
  const articleId = `${type}_${destination.toLowerCase().replace(/\s+/g, '-')}_${Date.now().toString(36)}`;

  const blocks: ContentBlock[] = [];

  // Parse sections from data
  for (const [key, value] of Object.entries(data.sections || data)) {
    if (typeof value === 'string' && value.length > 50) {
      blocks.push({ id: `${key}_heading`, type: 'heading', content: formatSectionTitle(key) } as ContentBlock);
      blocks.push({ id: key, type: 'text', content: value } as ContentBlock);
    } else if (Array.isArray(value)) {
      blocks.push({ id: `${key}_heading`, type: 'heading', content: formatSectionTitle(key) } as ContentBlock);
      blocks.push({ id: key, type: 'bullets', items: value } as ContentBlock);
    }
  }

  const wordCount = estimateWordCount(blocks);

  return {
    id: articleId,
    type,
    content: {
      title: data.title || `${destination} ${formatSectionTitle(type)}`,
      subtitle: data.subtitle,
      introduction: data.introduction || '',
      blocks,
      conclusion: data.conclusion || '',
      faq: parseFaq(data.faq || []),
      relatedArticles: [],
    },
    metadata: {
      slug: generateSlug(data.title || `${destination} ${type}`),
      status: 'draft',
      locale: options.locale || 'en',
      destination,
      category: type,
      tags: data.secondaryKeywords || [],
      estimatedReadTime: Math.ceil(wordCount / 200),
      wordCount,
    },
    seoData: {
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription || '',
      primaryKeyword: data.primaryKeyword || destination,
      secondaryKeywords: data.secondaryKeywords || [],
      headings: extractHeadings(blocks),
    },
    aeoData: {
      answerCapsule: data.answerCapsule || '',
      quickAnswer: data.quickAnswer || '',
      keyTakeaways: data.keyTakeaways || [],
    },
    sourceEntities: entities.map(e => e.id),
    generatedAt: new Date(),
    processingTime: Date.now() - startTime,
  };
}

function parseItineraryResult(
  data: any,
  entities: WebEnrichedEntity[],
  destination: string,
  days: number,
  options: ArticleGenerationOptions,
  startTime: number
): GeneratedArticle {
  const articleId = `itinerary_${days}days_${destination.toLowerCase().replace(/\s+/g, '-')}_${Date.now().toString(36)}`;

  const blocks: ContentBlock[] = [
    { id: 'intro', type: 'text', content: data.introduction || '' } as ContentBlock,
  ];

  // Build day-by-day content
  for (const day of data.dayByDay || []) {
    blocks.push({ id: `day${day.day}_heading`, type: 'heading', content: `Day ${day.day}: ${day.title || ''}` } as ContentBlock);
    blocks.push({ id: `day${day.day}_content`, type: 'text', content: day.description || '' } as ContentBlock);

    if (day.activities) {
      blocks.push({ id: `day${day.day}_activities`, type: 'bullets', items: day.activities } as ContentBlock);
    }
  }

  if (data.budget) {
    blocks.push({ id: 'budget_heading', type: 'heading', content: 'Budget Breakdown' } as ContentBlock);
    blocks.push({ id: 'budget', type: 'text', content: typeof data.budget === 'string' ? data.budget : JSON.stringify(data.budget) } as ContentBlock);
  }

  if (data.tips) {
    blocks.push({ id: 'tips_heading', type: 'heading', content: 'Tips' } as ContentBlock);
    blocks.push({ id: 'tips', type: 'bullets', items: data.tips } as ContentBlock);
  }

  const wordCount = estimateWordCount(blocks);

  return {
    id: articleId,
    type: 'itinerary',
    content: {
      title: data.title || `${days} Days in ${destination}`,
      subtitle: data.subtitle,
      introduction: data.introduction || '',
      blocks,
      conclusion: data.conclusion || '',
      faq: parseFaq(data.faq || []),
      relatedArticles: [],
    },
    metadata: {
      slug: generateSlug(data.title || `${days}-days-${destination}`),
      status: 'draft',
      locale: options.locale || 'en',
      destination,
      category: 'itineraries',
      tags: data.secondaryKeywords || [`${days} days`, 'itinerary'],
      estimatedReadTime: Math.ceil(wordCount / 200),
      wordCount,
    },
    seoData: {
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription || '',
      primaryKeyword: data.primaryKeyword || `${destination} ${days} days`,
      secondaryKeywords: data.secondaryKeywords || [],
      headings: extractHeadings(blocks),
    },
    aeoData: {
      answerCapsule: data.answerCapsule || '',
      quickAnswer: data.quickAnswer || '',
      keyTakeaways: data.keyTakeaways || [],
    },
    sourceEntities: entities.map(e => e.id),
    generatedAt: new Date(),
    processingTime: Date.now() - startTime,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function groupEntitiesByType(entities: WebEnrichedEntity[]): Record<string, WebEnrichedEntity[]> {
  const groups: Record<string, WebEnrichedEntity[]> = {};
  for (const entity of entities) {
    if (!groups[entity.type]) {
      groups[entity.type] = [];
    }
    groups[entity.type].push(entity);
  }
  return groups;
}

function findEntitiesInNeighborhood(
  entities: WebEnrichedEntity[],
  neighborhoodName: string
): WebEnrichedEntity[] {
  const lowerName = neighborhoodName.toLowerCase();
  return entities.filter(e =>
    e.location?.neighborhood?.toLowerCase().includes(lowerName) ||
    e.location?.address?.toLowerCase().includes(lowerName) ||
    e.description?.toLowerCase().includes(lowerName)
  );
}

function getTypePlural(type: string): string {
  const plurals: Record<string, string> = {
    hotel: 'Hotels',
    restaurant: 'Restaurants',
    attraction: 'Attractions',
    beach: 'Beaches',
    museum: 'Museums',
    mall: 'Shopping Malls',
    park: 'Parks',
    landmark: 'Landmarks',
    neighborhood: 'Neighborhoods',
  };
  return plurals[type] || `${type}s`;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

function parseFaq(items: any[]): FaqItem[] {
  return items.map(item => ({
    question: item.question || item.q || '',
    answer: item.answer || item.a || '',
  }));
}

function extractHeadings(blocks: ContentBlock[]): { level: number; text: string }[] {
  return blocks
    .filter(b => b.type === 'heading')
    .map(b => ({
      level: 2,
      text: b.content || '',
    }));
}

function estimateWordCount(blocks: ContentBlock[]): number {
  let count = 0;
  for (const block of blocks) {
    if (block.content) {
      count += block.content.split(/\s+/).length;
    }
    if ((block as any).items) {
      count += (block as any).items.join(' ').split(/\s+/).length;
    }
  }
  return count;
}

function formatSectionTitle(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

/**
 * Get article generation stats
 */
export function getArticleStats(articles: GeneratedArticle[]): {
  total: number;
  byType: Record<string, number>;
  totalWordCount: number;
  avgReadTime: number;
} {
  const byType: Record<string, number> = {};
  let totalWords = 0;
  let totalReadTime = 0;

  for (const article of articles) {
    byType[article.type] = (byType[article.type] || 0) + 1;
    totalWords += article.metadata.wordCount;
    totalReadTime += article.metadata.estimatedReadTime;
  }

  return {
    total: articles.length,
    byType,
    totalWordCount: totalWords,
    avgReadTime: articles.length > 0 ? Math.round(totalReadTime / articles.length) : 0,
  };
}
