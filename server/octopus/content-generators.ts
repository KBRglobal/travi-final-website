/**
 * Octopus Engine - Content Page Generators
 * Generates full content pages for hotels, restaurants, attractions
 * Uses enriched entity data to create SEO-optimized pages
 * 
 * UPGRADED: December 2025
 * - Added ContentTemplate and TemplateSection interfaces
 * - Added templates for temple, street food, nightlife, shopping, monthly, audience guides
 * - Added comparison and ranking article templates
 * - Added helper functions for content generation
 * - SEO/AEO compliant article generation
 */

import { getAllUnifiedProviders } from '../ai/providers';
import { queuedAIRequest, RequestPriority } from '../ai/request-queue';
import { generateAnswerCapsule } from '../aeo/answer-capsule-generator';
import { generateAEOSchema } from '../aeo/aeo-schema-generator';
import { log } from '../lib/logger';
import type { WebEnrichedEntity } from './web-search-enricher';

// Flag to enable/disable queue for all content generation
let useQueueForGeneration = true;

export function setUseQueueForGeneration(enabled: boolean): void {
  useQueueForGeneration = enabled;
  octopusLogger.info(`Queue for content generation ${enabled ? 'enabled' : 'disabled'}`);
}

// Alias functions for API routes
export function setQueueEnabled(enabled: boolean): void {
  setUseQueueForGeneration(enabled);
}

export function isQueueEnabled(): boolean {
  return useQueueForGeneration;
}

// ============================================================================
// Content Block Types
// ============================================================================

interface ContentBlock {
  id: string;
  type: string;
  content?: string;
  items?: string[];
  heading?: string;
}

interface QuickInfoItem {
  icon: string;
  label: string;
  value: string;
}

interface HighlightItem {
  icon?: string;
  image?: string;
  title: string;
  text?: string;
  description?: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const octopusLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Octopus Generator] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Octopus Generator] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Octopus Generator] ${msg}`, data),
};

// Helper function to generate AI completion using queue or direct providers
async function generateAICompletion(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number; priority?: RequestPriority } = {}
): Promise<string | null> {
  const { temperature = 0.7, maxTokens = 4000, priority = RequestPriority.NORMAL } = options;

  if (useQueueForGeneration) {
    try {
      const result = await queuedAIRequest({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        maxTokens,
        responseFormat: { type: 'json_object' },
      }, priority);
      return result.content;
    } catch (error) {
      octopusLogger.error('Queued AI request failed', { error });
      return null;
    }
  }

  // Fallback to direct provider calls
  const providers = getAllUnifiedProviders();
  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        maxTokens,
        responseFormat: { type: 'json_object' },
      });
      return result.content;
    } catch (error) {
      octopusLogger.warn('Provider failed', { provider: provider.name, error });
      continue;
    }
  }

  return null;
}

// ============================================================================
// Content Template Types (NEW)
// ============================================================================

export type ContentType =
  | 'entity_page'
  | 'hotel'
  | 'restaurant'
  | 'attraction'
  | 'neighborhood'
  | 'temple_guide'
  | 'street_food_guide'
  | 'nightlife_guide'
  | 'shopping_guide'
  | 'monthly_guide'
  | 'audience_guide'
  | 'comparison'
  | 'ranking'
  | 'itinerary'
  | 'budget_guide'
  | 'tips_article';

export interface TemplateSection {
  type: 'intro' | 'h2_section' | 'conclusion' | 'faq' | 'cta';
  title?: string;
  wordCount: number;
  includeImage: boolean;
  content?: string;
  imagePlaceholder?: string;
}

export interface ContentTemplate {
  id: string;
  name: string;
  type: ContentType;
  sections: TemplateSection[];
  wordCountRange: { min: number; max: number };
  requiredElements: string[];
  internalLinkCount: { min: number; max: number };
  externalLinkCount: { min: number; max: number };
  faqCount: { min: number; max: number };
}

export interface LinkPlaceholder {
  type: 'internal' | 'external';
  anchor: string;
  suggestedUrl?: string;
  context: string;
}

export interface GeneratedArticle {
  id: string;
  templateId: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  wordCount: number;
  sections: GeneratedSection[];
  internalLinks: LinkPlaceholder[];
  externalLinks: LinkPlaceholder[];
  images: ImagePlaceholder[];
  faq: FaqItem[];
  aeoData: AEOData;
  generatedAt: Date;
}

export interface GeneratedSection {
  type: TemplateSection['type'];
  title?: string;
  content: string;
  wordCount: number;
  image?: ImagePlaceholder;
}

export interface ImagePlaceholder {
  id: string;
  alt: string;
  caption?: string;
  suggestedQuery: string;
  placement: 'hero' | 'section' | 'gallery';
}

// ============================================================================
// Page Types (Original)
// ============================================================================

export interface GeneratedPage {
  id: string;
  type: 'hotel' | 'restaurant' | 'attraction' | 'neighborhood';
  sourceEntityId: string;
  content: PageContent;
  metadata: PageMetadata;
  seoData: SEOData;
  aeoData: AEOData;
  generatedAt: Date;
  processingTime: number;
}

export interface PageContent {
  title: string;
  subtitle?: string;
  blocks: ContentBlock[];
  quickInfo: QuickInfoItem[];
  highlights: HighlightItem[];
  faq: FaqItem[];
  images: PageImage[];
}

export interface PageImage {
  url: string;
  alt: string;
  caption?: string;
  type: 'hero' | 'gallery' | 'content';
  attribution?: string;
}

export interface PageMetadata {
  slug: string;
  status: 'draft' | 'ready' | 'published';
  locale: string;
  destination: string;
  category?: string;
  tags: string[];
  relatedPages: string[];
}

export interface SEOData {
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  schema: Record<string, unknown>;
}

export interface AEOData {
  answerCapsule: string;
  quickAnswer: string;
  keyFacts: string[];
  differentiator: string;
}

export interface GenerationOptions {
  locale?: string;
  tone?: 'professional' | 'friendly' | 'luxury' | 'casual';
  contentDepth?: 'brief' | 'standard' | 'comprehensive';
  includeAEO?: boolean;
  includeSchema?: boolean;
}

export interface BatchGenerationResult {
  pages: GeneratedPage[];
  successCount: number;
  failedCount: number;
  totalProcessingTime: number;
}

const DEFAULT_OPTIONS: GenerationOptions = {
  locale: 'en',
  tone: 'professional',
  contentDepth: 'standard',
  includeAEO: true,
  includeSchema: true,
};

// ============================================================================
// CONTENT TEMPLATES (NEW)
// ============================================================================

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  // Temple Guide Template
  {
    id: 'temple_guide',
    name: 'Temple & Religious Site Guide',
    type: 'temple_guide',
    wordCountRange: { min: 2000, max: 2500 },
    requiredElements: ['intro', 'history', 'what_to_see', 'dress_code', 'visiting_tips', 'nearby', 'conclusion', 'faq'],
    internalLinkCount: { min: 5, max: 8 },
    externalLinkCount: { min: 2, max: 3 },
    faqCount: { min: 5, max: 7 },
    sections: [
      { type: 'intro', wordCount: 125, includeImage: false },
      { type: 'h2_section', title: 'History & Significance', wordCount: 350, includeImage: true, imagePlaceholder: 'temple exterior historical view' },
      { type: 'h2_section', title: 'What to See & Do', wordCount: 350, includeImage: true, imagePlaceholder: 'temple interior main attraction' },
      { type: 'h2_section', title: 'Dress Code & Etiquette', wordCount: 250, includeImage: true, imagePlaceholder: 'appropriate temple attire' },
      { type: 'h2_section', title: 'Visiting Tips & Best Times', wordCount: 300, includeImage: true, imagePlaceholder: 'visitors at temple' },
      { type: 'h2_section', title: 'Nearby Attractions', wordCount: 250, includeImage: true, imagePlaceholder: 'nearby points of interest' },
      { type: 'conclusion', wordCount: 125, includeImage: false },
      { type: 'faq', wordCount: 250, includeImage: false },
    ],
  },

  // Street Food Guide Template
  {
    id: 'street_food_guide',
    name: 'Street Food Guide',
    type: 'street_food_guide',
    wordCountRange: { min: 2000, max: 2800 },
    requiredElements: ['intro', 'overview', 'top_dishes', 'best_stalls', 'prices', 'hygiene_tips', 'when_to_go', 'conclusion', 'faq'],
    internalLinkCount: { min: 6, max: 8 },
    externalLinkCount: { min: 2, max: 3 },
    faqCount: { min: 5, max: 8 },
    sections: [
      { type: 'intro', wordCount: 125, includeImage: false },
      { type: 'h2_section', title: 'Street Food Scene Overview', wordCount: 300, includeImage: true, imagePlaceholder: 'vibrant street food market' },
      { type: 'h2_section', title: 'Top Must-Try Dishes', wordCount: 400, includeImage: true, imagePlaceholder: 'signature local street food dishes' },
      { type: 'h2_section', title: 'Best Street Food Stalls & Markets', wordCount: 350, includeImage: true, imagePlaceholder: 'popular street food vendor' },
      { type: 'h2_section', title: 'Price Guide & Budget Tips', wordCount: 250, includeImage: true, imagePlaceholder: 'street food prices menu' },
      { type: 'h2_section', title: 'Hygiene & Safety Tips', wordCount: 250, includeImage: true, imagePlaceholder: 'clean street food preparation' },
      { type: 'h2_section', title: 'Best Times to Go', wordCount: 200, includeImage: true, imagePlaceholder: 'busy street food night market' },
      { type: 'conclusion', wordCount: 125, includeImage: false },
      { type: 'faq', wordCount: 300, includeImage: false },
    ],
  },

  // Nightlife Guide Template
  {
    id: 'nightlife_guide',
    name: 'Nightlife Guide',
    type: 'nightlife_guide',
    wordCountRange: { min: 2200, max: 3000 },
    requiredElements: ['intro', 'bar_scene', 'clubs', 'rooftops', 'dress_codes', 'safety_tips', 'conclusion', 'faq'],
    internalLinkCount: { min: 6, max: 8 },
    externalLinkCount: { min: 2, max: 3 },
    faqCount: { min: 5, max: 7 },
    sections: [
      { type: 'intro', wordCount: 125, includeImage: false },
      { type: 'h2_section', title: 'Bar Scene & Cocktail Lounges', wordCount: 400, includeImage: true, imagePlaceholder: 'stylish cocktail bar interior' },
      { type: 'h2_section', title: 'Best Clubs & Dance Venues', wordCount: 400, includeImage: true, imagePlaceholder: 'popular nightclub' },
      { type: 'h2_section', title: 'Rooftop Bars & Sky Lounges', wordCount: 350, includeImage: true, imagePlaceholder: 'rooftop bar city view' },
      { type: 'h2_section', title: 'Dress Codes & Entry Requirements', wordCount: 250, includeImage: true, imagePlaceholder: 'nightlife dress code examples' },
      { type: 'h2_section', title: 'Safety Tips & Getting Around', wordCount: 300, includeImage: true, imagePlaceholder: 'safe nightlife transportation' },
      { type: 'conclusion', wordCount: 125, includeImage: false },
      { type: 'faq', wordCount: 250, includeImage: false },
    ],
  },

  // Shopping Guide Template
  {
    id: 'shopping_guide',
    name: 'Shopping Guide',
    type: 'shopping_guide',
    wordCountRange: { min: 2000, max: 2500 },
    requiredElements: ['intro', 'malls', 'markets', 'luxury', 'budget', 'souvenirs', 'conclusion', 'faq'],
    internalLinkCount: { min: 5, max: 8 },
    externalLinkCount: { min: 2, max: 3 },
    faqCount: { min: 5, max: 7 },
    sections: [
      { type: 'intro', wordCount: 125, includeImage: false },
      { type: 'h2_section', title: 'Best Shopping Malls', wordCount: 350, includeImage: true, imagePlaceholder: 'modern shopping mall interior' },
      { type: 'h2_section', title: 'Traditional Markets & Bazaars', wordCount: 350, includeImage: true, imagePlaceholder: 'traditional local market' },
      { type: 'h2_section', title: 'Luxury Shopping Destinations', wordCount: 300, includeImage: true, imagePlaceholder: 'luxury boutique store' },
      { type: 'h2_section', title: 'Budget Shopping & Bargain Tips', wordCount: 300, includeImage: true, imagePlaceholder: 'budget shopping area' },
      { type: 'h2_section', title: 'Best Souvenirs to Buy', wordCount: 250, includeImage: true, imagePlaceholder: 'local souvenirs and crafts' },
      { type: 'conclusion', wordCount: 125, includeImage: false },
      { type: 'faq', wordCount: 200, includeImage: false },
    ],
  },

  // Monthly Guide Template
  {
    id: 'monthly_guide',
    name: 'Monthly Travel Guide',
    type: 'monthly_guide',
    wordCountRange: { min: 1800, max: 2200 },
    requiredElements: ['intro', 'weather', 'events', 'activities', 'tips', 'conclusion', 'faq'],
    internalLinkCount: { min: 5, max: 7 },
    externalLinkCount: { min: 2, max: 3 },
    faqCount: { min: 4, max: 6 },
    sections: [
      { type: 'intro', wordCount: 125, includeImage: false },
      { type: 'h2_section', title: 'Weather & Climate', wordCount: 300, includeImage: true, imagePlaceholder: 'seasonal weather scene' },
      { type: 'h2_section', title: 'Events & Festivals', wordCount: 350, includeImage: true, imagePlaceholder: 'local festival celebration' },
      { type: 'h2_section', title: 'Best Activities This Month', wordCount: 350, includeImage: true, imagePlaceholder: 'seasonal activity' },
      { type: 'h2_section', title: 'Travel Tips & Packing Guide', wordCount: 300, includeImage: true, imagePlaceholder: 'travel preparation' },
      { type: 'conclusion', wordCount: 125, includeImage: false },
      { type: 'faq', wordCount: 200, includeImage: false },
    ],
  },

  // Audience Guide Template (Families, Couples, Solo, etc.)
  {
    id: 'audience_guide',
    name: 'Audience-Specific Travel Guide',
    type: 'audience_guide',
    wordCountRange: { min: 2500, max: 3000 },
    requiredElements: ['intro', 'overview', 'top_picks', 'itinerary', 'budget', 'tips', 'faq', 'conclusion'],
    internalLinkCount: { min: 6, max: 8 },
    externalLinkCount: { min: 2, max: 3 },
    faqCount: { min: 6, max: 8 },
    sections: [
      { type: 'intro', wordCount: 150, includeImage: false },
      { type: 'h2_section', title: 'Why This Destination is Perfect', wordCount: 300, includeImage: true, imagePlaceholder: 'destination highlight for audience' },
      { type: 'h2_section', title: 'Top Picks & Recommendations', wordCount: 400, includeImage: true, imagePlaceholder: 'recommended attractions' },
      { type: 'h2_section', title: 'Sample Itinerary', wordCount: 400, includeImage: true, imagePlaceholder: 'day trip activities' },
      { type: 'h2_section', title: 'Budget Breakdown', wordCount: 300, includeImage: true, imagePlaceholder: 'budget travel planning' },
      { type: 'h2_section', title: 'Essential Tips & Advice', wordCount: 300, includeImage: true, imagePlaceholder: 'travel tips illustration' },
      { type: 'faq', wordCount: 300, includeImage: false },
      { type: 'conclusion', wordCount: 125, includeImage: false },
    ],
  },

  // Comparison Article Template
  {
    id: 'comparison',
    name: 'Comparison Article',
    type: 'comparison',
    wordCountRange: { min: 1800, max: 2200 },
    requiredElements: ['intro', 'overview', 'comparison_table', 'detailed_comparison', 'verdict', 'faq', 'conclusion'],
    internalLinkCount: { min: 5, max: 7 },
    externalLinkCount: { min: 2, max: 3 },
    faqCount: { min: 5, max: 7 },
    sections: [
      { type: 'intro', wordCount: 125, includeImage: false },
      { type: 'h2_section', title: 'Quick Overview', wordCount: 250, includeImage: true, imagePlaceholder: 'side by side comparison visual' },
      { type: 'h2_section', title: 'Comparison at a Glance', wordCount: 200, includeImage: true, imagePlaceholder: 'comparison table infographic' },
      { type: 'h2_section', title: 'Detailed Comparison', wordCount: 500, includeImage: true, imagePlaceholder: 'detailed feature comparison' },
      { type: 'h2_section', title: 'Our Verdict', wordCount: 250, includeImage: true, imagePlaceholder: 'winner recommendation' },
      { type: 'faq', wordCount: 250, includeImage: false },
      { type: 'conclusion', wordCount: 125, includeImage: false },
    ],
  },

  // Ranking Article Template
  {
    id: 'ranking',
    name: 'Ranking Article (Top X List)',
    type: 'ranking',
    wordCountRange: { min: 2500, max: 3500 },
    requiredElements: ['intro', 'ranking_items', 'conclusion', 'faq'],
    internalLinkCount: { min: 6, max: 8 },
    externalLinkCount: { min: 2, max: 3 },
    faqCount: { min: 5, max: 7 },
    sections: [
      { type: 'intro', wordCount: 150, includeImage: false },
      { type: 'h2_section', title: '#1 - Top Pick', wordCount: 300, includeImage: true, imagePlaceholder: 'number 1 ranked item' },
      { type: 'h2_section', title: '#2 - Second Best', wordCount: 250, includeImage: true, imagePlaceholder: 'number 2 ranked item' },
      { type: 'h2_section', title: '#3 - Third Choice', wordCount: 250, includeImage: true, imagePlaceholder: 'number 3 ranked item' },
      { type: 'h2_section', title: '#4 - Fourth Pick', wordCount: 250, includeImage: true, imagePlaceholder: 'number 4 ranked item' },
      { type: 'h2_section', title: '#5 - Fifth Selection', wordCount: 250, includeImage: true, imagePlaceholder: 'number 5 ranked item' },
      { type: 'h2_section', title: '#6 - Sixth Option', wordCount: 200, includeImage: true, imagePlaceholder: 'number 6 ranked item' },
      { type: 'h2_section', title: '#7 - Seventh Place', wordCount: 200, includeImage: true, imagePlaceholder: 'number 7 ranked item' },
      { type: 'h2_section', title: '#8 - Eighth Entry', wordCount: 200, includeImage: true, imagePlaceholder: 'number 8 ranked item' },
      { type: 'h2_section', title: '#9 - Ninth Spot', wordCount: 200, includeImage: true, imagePlaceholder: 'number 9 ranked item' },
      { type: 'h2_section', title: '#10 - Tenth Pick', wordCount: 200, includeImage: true, imagePlaceholder: 'number 10 ranked item' },
      { type: 'conclusion', wordCount: 150, includeImage: false },
      { type: 'faq', wordCount: 250, includeImage: false },
    ],
  },
];

// Get template by ID
export function getTemplateById(templateId: string): ContentTemplate | undefined {
  return CONTENT_TEMPLATES.find(t => t.id === templateId);
}

// Get template by content type
export function getTemplateByType(contentType: ContentType): ContentTemplate | undefined {
  return CONTENT_TEMPLATES.find(t => t.type === contentType);
}

// ============================================================================
// HELPER FUNCTIONS (NEW)
// ============================================================================

/**
 * Generate an introduction paragraph for an entity/destination
 * Target: 100-150 words, engaging hook, sets expectations
 */
export function generateIntro(entity: string, destination: string, context?: string): string {
  const introTemplates = [
    `Discover everything you need to know about ${entity} in ${destination}. This comprehensive guide covers all the essential information, insider tips, and practical advice to help you make the most of your visit. Whether you're a first-time visitor or returning traveler, you'll find valuable insights to enhance your experience.`,
    `Planning to explore ${entity} during your trip to ${destination}? You've come to the right place. In this guide, we break down everything from the best times to visit to money-saving tips, ensuring you have all the information needed for an unforgettable experience.`,
    `${entity} stands as one of ${destination}'s most remarkable experiences. This detailed guide walks you through what makes it special, how to prepare for your visit, and the insider knowledge that transforms a good trip into an extraordinary one.`,
  ];
  
  const template = introTemplates[Math.floor(Math.random() * introTemplates.length)];
  return context ? `${template} ${context}` : template;
}

/**
 * Generate an H2 section with proper structure
 * Target: 200-400 words based on wordCount parameter
 */
export function generateH2Section(
  topic: string,
  entity: string,
  wordCount: number,
  subpoints?: string[]
): string {
  const estimatedSentences = Math.ceil(wordCount / 20);
  const subpointsList = subpoints?.length 
    ? `\n\nKey points to cover:\n${subpoints.map(p => `- ${p}`).join('\n')}`
    : '';
  
  return `[CONTENT: Write ${wordCount} words about "${topic}" related to ${entity}. Include specific details, practical information, and engaging descriptions. Target ${estimatedSentences} sentences with varied length and structure.${subpointsList}]`;
}

/**
 * Generate a conclusion paragraph
 * Target: 100-150 words, summarizes key points, includes CTA
 */
export function generateConclusion(entity: string, destination?: string): string {
  const conclusionTemplates = [
    `${entity}${destination ? ` in ${destination}` : ''} offers an experience that's well worth your time. With the insights from this guide, you're now equipped to make the most of your visit. Remember to plan ahead, respect local customs, and embrace the unexpected moments that make travel so rewarding. Ready to start planning? Book your experience today and create memories that will last a lifetime.`,
    `Whether you're seeking adventure, relaxation, or cultural immersion, ${entity} delivers on all fronts. We hope this guide has answered your questions and inspired your travel plans. Don't forget to save this page for reference during your trip, and feel free to explore our other ${destination || 'destination'} guides for more travel inspiration.`,
  ];
  
  return conclusionTemplates[Math.floor(Math.random() * conclusionTemplates.length)];
}

/**
 * Generate SEO-optimized image alt text
 * Descriptive, includes entity name, under 125 characters
 */
export function generateImageAltText(topic: string, entity: string, destination?: string): string {
  const altTextTemplates = [
    `${topic} at ${entity}${destination ? ` in ${destination}` : ''}`,
    `${entity} ${topic.toLowerCase()} view${destination ? ` - ${destination}` : ''}`,
    `Scenic ${topic.toLowerCase()} of ${entity}${destination ? `, ${destination}` : ''}`,
    `${entity} featuring ${topic.toLowerCase()}${destination ? ` in ${destination}` : ''}`,
  ];
  
  const altText = altTextTemplates[Math.floor(Math.random() * altTextTemplates.length)];
  return altText.slice(0, 125);
}

/**
 * Suggest internal links based on content and destination
 * Returns array of suggested link anchors and pages
 */
export function suggestInternalLinks(
  content: string,
  destination: string,
  maxLinks: number = 8
): LinkPlaceholder[] {
  const links: LinkPlaceholder[] = [];
  
  const linkOpportunities = [
    { pattern: /hotel|accommodation|stay/i, anchor: 'best hotels', url: `/${destination.toLowerCase()}/hotels` },
    { pattern: /restaurant|dining|food|eat/i, anchor: 'top restaurants', url: `/${destination.toLowerCase()}/restaurants` },
    { pattern: /attraction|things to do|visit/i, anchor: 'top attractions', url: `/${destination.toLowerCase()}/attractions` },
    { pattern: /transport|getting around|taxi|metro/i, anchor: 'transportation guide', url: `/${destination.toLowerCase()}/transport` },
    { pattern: /neighborhood|area|district/i, anchor: 'neighborhood guide', url: `/${destination.toLowerCase()}/districts` },
    { pattern: /shopping|mall|market|buy/i, anchor: 'shopping guide', url: `/${destination.toLowerCase()}/shopping` },
    { pattern: /nightlife|bar|club|party/i, anchor: 'nightlife guide', url: `/${destination.toLowerCase()}/nightlife` },
    { pattern: /beach|coast|seaside/i, anchor: 'best beaches', url: `/${destination.toLowerCase()}/beaches` },
    { pattern: /temple|mosque|church|religious/i, anchor: 'religious sites', url: `/${destination.toLowerCase()}/temples` },
    { pattern: /museum|gallery|art/i, anchor: 'museums guide', url: `/${destination.toLowerCase()}/museums` },
    { pattern: /budget|cheap|affordable/i, anchor: 'budget travel tips', url: `/${destination.toLowerCase()}/budget-guide` },
    { pattern: /luxury|premium|high-end/i, anchor: 'luxury experiences', url: `/${destination.toLowerCase()}/luxury` },
  ];
  
  for (const opportunity of linkOpportunities) {
    if (links.length >= maxLinks) break;
    if (opportunity.pattern.test(content)) {
      links.push({
        type: 'internal',
        anchor: opportunity.anchor,
        suggestedUrl: opportunity.url,
        context: `Link to ${opportunity.anchor} when mentioned in content`,
      });
    }
  }
  
  if (links.length < 5) {
    links.push({
      type: 'internal',
      anchor: `${destination} travel guide`,
      suggestedUrl: `/${destination.toLowerCase()}`,
      context: 'Main destination page link',
    });
  }
  
  return links.slice(0, maxLinks);
}

/**
 * Suggest external links for authoritative sources
 */
export function suggestExternalLinks(
  content: string,
  destination: string,
  maxLinks: number = 3
): LinkPlaceholder[] {
  const links: LinkPlaceholder[] = [];
  
  const externalOpportunities = [
    { pattern: /official|government|visa/i, anchor: 'official tourism website', context: 'Link to official tourism board' },
    { pattern: /unesco|world heritage/i, anchor: 'UNESCO World Heritage', context: 'Link to UNESCO site page' },
    { pattern: /booking|reservation/i, anchor: 'official booking', context: 'Link to official booking portal' },
    { pattern: /weather|climate|forecast/i, anchor: 'weather forecast', context: 'Link to weather service' },
    { pattern: /embassy|consulate/i, anchor: 'embassy information', context: 'Link to embassy/consulate site' },
  ];
  
  for (const opportunity of externalOpportunities) {
    if (links.length >= maxLinks) break;
    if (opportunity.pattern.test(content)) {
      links.push({
        type: 'external',
        anchor: opportunity.anchor,
        context: opportunity.context,
      });
    }
  }
  
  if (links.length < 2) {
    links.push({
      type: 'external',
      anchor: `${destination} official tourism`,
      context: 'Link to destination official tourism board',
    });
  }
  
  return links.slice(0, maxLinks);
}

/**
 * Generate FAQ items based on content type
 */
export function generateFaqItems(
  entity: string,
  destination: string,
  contentType: ContentType,
  count: number = 6
): FaqItem[] {
  const faqTemplates: Record<string, Array<{ q: string; a: string }>> = {
    temple_guide: [
      { q: `What is the dress code for visiting ${entity}?`, a: `Visitors should dress modestly when visiting ${entity}. This typically means covering shoulders and knees. Many temples provide cover-ups at the entrance if needed.` },
      { q: `What are the opening hours of ${entity}?`, a: `${entity} is generally open to visitors throughout the day. We recommend checking the current schedule before your visit as hours may vary for ceremonies and holidays.` },
      { q: `Is there an entrance fee for ${entity}?`, a: `Entry requirements vary. Some temples are free while others have a modest fee. Check our detailed guide above for the most current pricing information.` },
      { q: `Can I take photos inside ${entity}?`, a: `Photography policies vary by area within ${entity}. Generally, exterior photos are permitted but flash photography inside may be restricted out of respect.` },
      { q: `What is the best time to visit ${entity}?`, a: `Early morning or late afternoon are ideal times to visit ${entity} to avoid crowds and experience a more peaceful atmosphere.` },
      { q: `How long should I spend at ${entity}?`, a: `Plan for at least 1-2 hours to fully appreciate ${entity}. Art and history enthusiasts may want to allow more time.` },
    ],
    street_food_guide: [
      { q: `Is street food safe to eat in ${destination}?`, a: `Yes, street food in ${destination} can be safe and delicious. Look for busy stalls with high turnover, freshly cooked items, and vendors using clean practices.` },
      { q: `How much does street food cost in ${destination}?`, a: `Street food in ${destination} is very affordable, with most dishes costing between $1-5 USD equivalent. A full meal can often be had for under $10.` },
      { q: `What are the must-try street food dishes in ${destination}?`, a: `The most popular street food dishes are highlighted in our guide above. Don't miss the local specialties that ${destination} is famous for.` },
      { q: `Where are the best street food markets in ${destination}?`, a: `The best street food markets and areas are detailed in our guide. Popular spots include both day markets and night markets.` },
      { q: `Can vegetarians find street food options in ${destination}?`, a: `Yes, there are vegetarian-friendly street food options available. Many vendors can customize dishes upon request.` },
      { q: `What time do street food stalls open in ${destination}?`, a: `Street food stalls operate at various hours. Morning markets typically start at dawn, while night markets come alive after sunset.` },
    ],
    nightlife_guide: [
      { q: `What is the legal drinking age in ${destination}?`, a: `The legal drinking age in ${destination} varies by country/region. Always carry valid ID and check local regulations before going out.` },
      { q: `What should I wear to clubs in ${destination}?`, a: `Dress codes vary by venue. Upscale clubs typically require smart casual or formal attire. Avoid flip-flops, shorts, and overly casual wear.` },
      { q: `Are clubs safe in ${destination}?`, a: `Popular clubs in ${destination} are generally safe, but always practice common sense. Stay aware of your surroundings and keep valuables secure.` },
      { q: `What time do clubs close in ${destination}?`, a: `Closing times vary by venue and local regulations. Many clubs stay open until the early morning hours, especially on weekends.` },
      { q: `How much does a night out cost in ${destination}?`, a: `Costs vary widely. Budget $30-100+ per person depending on venue choice, drinks, and whether cover charges apply.` },
      { q: `What are the best areas for nightlife in ${destination}?`, a: `The main nightlife districts are covered in our guide above. Each area offers a different vibe and experience.` },
    ],
    default: [
      { q: `What is the best time to visit ${entity} in ${destination}?`, a: `The ideal time depends on your preferences and what you want to experience. Check our detailed guide above for seasonal recommendations.` },
      { q: `How do I get to ${entity} in ${destination}?`, a: `${entity} is accessible by various transportation options including public transit, taxi, and ride-sharing services. See our transportation tips above.` },
      { q: `Is ${entity} suitable for families?`, a: `Yes, ${entity} can be enjoyed by visitors of all ages. We recommend checking specific amenities and accessibility features for your family's needs.` },
      { q: `How much time should I spend at ${entity}?`, a: `We recommend allocating at least 2-3 hours to fully experience ${entity}, though this may vary based on your interests.` },
      { q: `What are the prices/costs for ${entity}?`, a: `Pricing information is detailed in our guide above. Costs can vary by season and specific services.` },
      { q: `Do I need to book ${entity} in advance?`, a: `Advance booking is recommended, especially during peak season. This ensures availability and sometimes offers better rates.` },
    ],
  };
  
  const templateKey = faqTemplates[contentType] ? contentType : 'default';
  const selectedFaqs = faqTemplates[templateKey].slice(0, count);
  
  return selectedFaqs.map(item => ({
    question: item.q,
    answer: item.a,
  }));
}

/**
 * Calculate estimated word count for a template
 */
export function calculateTemplateWordCount(template: ContentTemplate): { min: number; max: number; average: number } {
  const sectionTotal = template.sections.reduce((sum, section) => sum + section.wordCount, 0);
  
  return {
    min: Math.max(template.wordCountRange.min, sectionTotal * 0.9),
    max: Math.min(template.wordCountRange.max, sectionTotal * 1.1),
    average: sectionTotal,
  };
}

/**
 * Validate that generated content meets template requirements
 */
export function validateContent(
  content: string,
  template: ContentTemplate
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  const wordCount = content.split(/\s+/).length;
  if (wordCount < template.wordCountRange.min) {
    issues.push(`Content is too short: ${wordCount} words (minimum: ${template.wordCountRange.min})`);
  }
  if (wordCount > template.wordCountRange.max) {
    issues.push(`Content is too long: ${wordCount} words (maximum: ${template.wordCountRange.max})`);
  }
  
  const h2Count = (content.match(/## /g) || []).length;
  const expectedH2 = template.sections.filter(s => s.type === 'h2_section').length;
  if (h2Count < expectedH2) {
    issues.push(`Missing H2 sections: found ${h2Count}, expected ${expectedH2}`);
  }
  
  for (const element of template.requiredElements) {
    const elementPattern = new RegExp(element.replace(/_/g, '[ _-]'), 'i');
    if (!elementPattern.test(content)) {
      issues.push(`Missing required element: ${element}`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Generate image placeholders for a template
 */
export function generateImagePlaceholders(
  template: ContentTemplate,
  entity: string,
  destination: string
): ImagePlaceholder[] {
  const images: ImagePlaceholder[] = [];
  
  images.push({
    id: 'hero',
    alt: generateImageAltText('Hero view', entity, destination),
    caption: `${entity} - ${destination}`,
    suggestedQuery: `${entity} ${destination} hero image`,
    placement: 'hero',
  });
  
  template.sections
    .filter(s => s.includeImage && s.type === 'h2_section')
    .forEach((section, index) => {
      images.push({
        id: `section_${index}`,
        alt: generateImageAltText(section.title || 'Section', entity, destination),
        caption: section.title,
        suggestedQuery: section.imagePlaceholder || `${entity} ${section.title}`,
        placement: 'section',
      });
    });
  
  return images;
}

// ============================================================================
// Main Generation Functions
// ============================================================================

/**
 * Generate content pages for multiple entities
 */
export async function generateContentPages(
  entities: WebEnrichedEntity[],
  destination: string,
  options: GenerationOptions = {}
): Promise<BatchGenerationResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const pages: GeneratedPage[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const entity of entities) {
    try {
      const page = await generateSinglePage(entity, destination, opts);
      if (page) {
        pages.push(page);
        successCount++;
      }
    } catch (error) {
      failedCount++;
      octopusLogger.error('Page generation failed', { entity: entity.name, error });
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  octopusLogger.info('Batch page generation complete', {
    total: entities.length,
    success: successCount,
    failed: failedCount,
    processingTime: Date.now() - startTime,
  });

  return {
    pages,
    successCount,
    failedCount,
    totalProcessingTime: Date.now() - startTime,
  };
}

/**
 * Generate a single content page
 */
async function generateSinglePage(
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions
): Promise<GeneratedPage | null> {
  const startTime = Date.now();

  const providers = getAllUnifiedProviders();
  if (providers.length === 0) {
    throw new Error('No AI provider available for content generation');
  }

  let page: GeneratedPage | null = null;

  switch (entity.type) {
    case 'hotel':
      page = await generateHotelPage(entity, destination, options, providers);
      break;
    case 'restaurant':
      page = await generateRestaurantPage(entity, destination, options, providers);
      break;
    case 'attraction':
    case 'museum':
    case 'landmark':
    case 'beach':
    case 'mall':
    case 'park':
      page = await generateAttractionPage(entity, destination, options, providers);
      break;
    case 'neighborhood':
      page = await generateNeighborhoodPage(entity, destination, options, providers);
      break;
    default:
      octopusLogger.warn('Unknown entity type for page generation', { type: (entity as any).type });
      return null;
  }

  if (page) {
    page.processingTime = Date.now() - startTime;

    if (options.includeAEO) {
      try {
        const capsuleInput = {
          contentId: page.id,
          title: page.content.title,
          description: page.seoData.metaDescription,
          type: entity.type as any,
          destination,
          highlights: page.content.highlights.map(h => h.text || ''),
          quickFacts: page.aeoData.keyFacts,
        };
      } catch (error) {
        octopusLogger.warn('AEO generation failed', { pageId: page.id, error });
      }
    }

    octopusLogger.info('Page generated', {
      pageId: page.id,
      type: page.type,
      title: page.content.title,
      processingTime: page.processingTime,
    });
  }

  return page;
}

// ============================================================================
// Hotel Page Generator
// ============================================================================

async function generateHotelPage(
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions,
  providers: ReturnType<typeof getAllUnifiedProviders>
): Promise<GeneratedPage | null> {
  const prompt = buildHotelPrompt(entity, destination, options);

  const result = await generateAICompletion(HOTEL_SYSTEM_PROMPT, prompt, { maxTokens: 4000 });
  if (!result) {
    octopusLogger.warn('Hotel generation failed - no result');
    return null;
  }

  try {
    const parsed = JSON.parse(result);
    return parseHotelResult(parsed, entity, destination, options);
  } catch (error) {
    octopusLogger.error('Failed to parse hotel generation result', { error });
    return null;
  }
}

const HOTEL_SYSTEM_PROMPT = `You are an expert travel content writer specializing in hotel descriptions.
Create engaging, SEO-optimized content that helps travelers make informed decisions.

Your content should:
- Be accurate and based on provided data
- Highlight unique selling points
- Include practical information
- Be optimized for both search engines and AI answer engines
- Use natural, engaging language
- Generate 1800-2500 words of content
- Include 5-8 internal link opportunities
- Include 2-3 external link opportunities

Output valid JSON only.`;

function buildHotelPrompt(
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions
): string {
  const data = {
    name: entity.name,
    description: entity.description,
    location: entity.location,
    googleData: entity.googleMapsData,
    webData: entity.webSearchData,
  };

  return `Create a comprehensive hotel page for:

HOTEL DATA:
${JSON.stringify(data, null, 2)}

DESTINATION: ${destination}
TONE: ${options.tone}
DEPTH: ${options.contentDepth}

Generate:
1. SEO-optimized title and meta description
2. Introduction (100-150 words)
3. Content blocks with H2 sections (each 200-400 words):
   - Overview & Location
   - Rooms & Suites
   - Amenities & Facilities  
   - Dining Options
   - What Makes It Special
   - Practical Information
4. Quick info bar items
5. Highlights (5-8 key selling points)
6. FAQ (5-7 common questions with detailed answers)
7. Conclusion (100-150 words)
8. Answer capsule for AI engines (40-60 words with key facts)
9. Suggested internal links (5-8)
10. Suggested external links (2-3)

Each H2 section should include an image placeholder with alt text.

Response JSON structure:
{
  "title": "Hotel Name - Location | Descriptive Tagline",
  "subtitle": "Brief tagline",
  "metaTitle": "SEO optimized title (50-60 chars)",
  "metaDescription": "SEO meta description (150-160 chars)",
  "primaryKeyword": "main keyword",
  "secondaryKeywords": ["keyword2", "keyword3"],
  "blocks": [
    { "type": "intro", "content": "100-150 word introduction..." },
    { "type": "heading", "content": "Overview & Location" },
    { "type": "text", "content": "200-400 words...", "image": { "alt": "descriptive alt text", "caption": "caption" } },
    { "type": "heading", "content": "Rooms & Suites" },
    { "type": "text", "content": "200-400 words...", "image": { "alt": "descriptive alt text", "caption": "caption" } },
    { "type": "bullets", "items": ["..."] }
  ],
  "quickInfo": [
    { "icon": "star", "label": "Rating", "value": "5-star" }
  ],
  "highlights": [
    { "icon": "pool", "title": "Infinity Pool", "text": "Description" }
  ],
  "faq": [
    { "question": "Detailed question?", "answer": "Comprehensive answer (50-100 words)" }
  ],
  "internalLinks": [
    { "anchor": "other hotels in area", "url": "/destination/hotels" }
  ],
  "externalLinks": [
    { "anchor": "official website", "url": "https://..." }
  ],
  "answerCapsule": "40-60 word answer capsule with key facts",
  "quickAnswer": "One sentence answer",
  "keyFacts": ["fact1", "fact2", "fact3"],
  "differentiator": "What makes this hotel unique"
}`;
}

function parseHotelResult(
  data: any,
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions
): GeneratedPage {
  const pageId = `hotel_${entity.id}_${Date.now().toString(36)}`;
  const slug = generateSlug(entity.name, destination);

  return {
    id: pageId,
    type: 'hotel',
    sourceEntityId: entity.id,
    content: {
      title: data.title || entity.name,
      subtitle: data.subtitle,
      blocks: parseBlocks(data.blocks || []),
      quickInfo: parseQuickInfo(data.quickInfo || []),
      highlights: parseHighlights(data.highlights || []),
      faq: parseFaq(data.faq || []),
      images: buildImages(entity),
    },
    metadata: {
      slug,
      status: 'draft',
      locale: options.locale || 'en',
      destination,
      category: 'hotels',
      tags: data.secondaryKeywords || [],
      relatedPages: [],
    },
    seoData: {
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription || entity.description,
      primaryKeyword: data.primaryKeyword || entity.name,
      secondaryKeywords: data.secondaryKeywords || [],
      schema: buildHotelSchema(entity, data),
    },
    aeoData: {
      answerCapsule: data.answerCapsule || '',
      quickAnswer: data.quickAnswer || '',
      keyFacts: data.keyFacts || [],
      differentiator: data.differentiator || '',
    },
    generatedAt: new Date(),
    processingTime: 0,
  };
}

// ============================================================================
// Restaurant Page Generator
// ============================================================================

async function generateRestaurantPage(
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions,
  providers: ReturnType<typeof getAllUnifiedProviders>
): Promise<GeneratedPage | null> {
  const prompt = buildRestaurantPrompt(entity, destination, options);

  const result = await generateAICompletion(RESTAURANT_SYSTEM_PROMPT, prompt, { maxTokens: 4000 });
  if (!result) {
    octopusLogger.warn('Restaurant generation failed - no result');
    return null;
  }

  try {
    const parsed = JSON.parse(result);
    return parseRestaurantResult(parsed, entity, destination, options);
  } catch (error) {
    octopusLogger.error('Failed to parse restaurant generation result', { error });
    return null;
  }
}

const RESTAURANT_SYSTEM_PROMPT = `You are an expert food and travel content writer.
Create engaging restaurant content that captures the dining experience and helps travelers choose.

Your content should:
- Highlight cuisine type and specialties
- Include practical info (hours, prices, reservations)
- Describe atmosphere and ambiance
- Be SEO and AEO optimized
- Generate 1800-2500 words of content
- Include 5-8 internal link opportunities
- Include 2-3 external link opportunities

Output valid JSON only.`;

function buildRestaurantPrompt(
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions
): string {
  const data = {
    name: entity.name,
    description: entity.description,
    location: entity.location,
    googleData: entity.googleMapsData,
    webData: entity.webSearchData,
    cuisine: (entity as any).cuisineType,
    priceRange: (entity as any).priceRange,
  };

  return `Create a comprehensive restaurant page for:

RESTAURANT DATA:
${JSON.stringify(data, null, 2)}

DESTINATION: ${destination}
TONE: ${options.tone}

Generate content including:
1. Introduction (100-150 words)
2. H2 Sections (each 200-400 words with image placeholder):
   - Overview & Atmosphere
   - Menu Highlights
   - Signature Dishes
   - Dining Experience
   - Practical Information
3. Quick info (cuisine, price, hours)
4. Highlights (5-8)
5. FAQ (5-7 questions with detailed answers)
6. Conclusion (100-150 words)
7. AEO answer capsule
8. Internal links (5-8)
9. External links (2-3)

Response JSON structure (same as hotel but for restaurant context):
{
  "title": "...",
  "subtitle": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "primaryKeyword": "...",
  "secondaryKeywords": [],
  "blocks": [],
  "quickInfo": [],
  "highlights": [],
  "faq": [],
  "internalLinks": [],
  "externalLinks": [],
  "answerCapsule": "...",
  "quickAnswer": "...",
  "keyFacts": [],
  "differentiator": "..."
}`;
}

function parseRestaurantResult(
  data: any,
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions
): GeneratedPage {
  const pageId = `restaurant_${entity.id}_${Date.now().toString(36)}`;
  const slug = generateSlug(entity.name, destination);

  return {
    id: pageId,
    type: 'restaurant',
    sourceEntityId: entity.id,
    content: {
      title: data.title || entity.name,
      subtitle: data.subtitle,
      blocks: parseBlocks(data.blocks || []),
      quickInfo: parseQuickInfo(data.quickInfo || []),
      highlights: parseHighlights(data.highlights || []),
      faq: parseFaq(data.faq || []),
      images: buildImages(entity),
    },
    metadata: {
      slug,
      status: 'draft',
      locale: options.locale || 'en',
      destination,
      category: 'restaurants',
      tags: data.secondaryKeywords || [],
      relatedPages: [],
    },
    seoData: {
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription || entity.description,
      primaryKeyword: data.primaryKeyword || entity.name,
      secondaryKeywords: data.secondaryKeywords || [],
      schema: buildRestaurantSchema(entity, data),
    },
    aeoData: {
      answerCapsule: data.answerCapsule || '',
      quickAnswer: data.quickAnswer || '',
      keyFacts: data.keyFacts || [],
      differentiator: data.differentiator || '',
    },
    generatedAt: new Date(),
    processingTime: 0,
  };
}

// ============================================================================
// Attraction Page Generator
// ============================================================================

async function generateAttractionPage(
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions,
  providers: ReturnType<typeof getAllUnifiedProviders>
): Promise<GeneratedPage | null> {
  const prompt = buildAttractionPrompt(entity, destination, options);

  const result = await generateAICompletion(ATTRACTION_SYSTEM_PROMPT, prompt, { maxTokens: 4000 });
  if (!result) {
    octopusLogger.warn('Attraction generation failed - no result');
    return null;
  }

  try {
    const parsed = JSON.parse(result);
    return parseAttractionResult(parsed, entity, destination, options);
  } catch (error) {
    octopusLogger.error('Failed to parse attraction generation result', { error });
    return null;
  }
}

const ATTRACTION_SYSTEM_PROMPT = `You are an expert travel content writer specializing in attractions and experiences.
Create engaging content that inspires visitors and provides practical visiting information.

Your content should:
- Capture what makes the attraction special
- Include practical visitor info (hours, tickets, tips)
- Be optimized for search and AI engines
- Help visitors plan their visit
- Generate 1800-2500 words of content
- Include 5-8 internal link opportunities
- Include 2-3 external link opportunities

Output valid JSON only.`;

function buildAttractionPrompt(
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions
): string {
  const data = {
    name: entity.name,
    type: entity.type,
    description: entity.description,
    location: entity.location,
    googleData: entity.googleMapsData,
    webData: entity.webSearchData,
  };

  return `Create a comprehensive attraction page for:

ATTRACTION DATA:
${JSON.stringify(data, null, 2)}

DESTINATION: ${destination}
ATTRACTION TYPE: ${entity.type}

Generate content including:
1. Introduction (100-150 words)
2. H2 Sections (each 200-400 words with image placeholder):
   - Overview & History
   - What to See & Do
   - Visitor Information
   - Best Time to Visit
   - Tips for Your Visit
3. Quick info (hours, tickets, duration)
4. Highlights (5-8)
5. FAQ (5-7 questions with detailed answers)
6. Conclusion (100-150 words)
7. AEO answer capsule
8. Internal links (5-8)
9. External links (2-3)

Response JSON structure:
{
  "title": "...",
  "subtitle": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "primaryKeyword": "...",
  "secondaryKeywords": [],
  "blocks": [],
  "quickInfo": [],
  "highlights": [],
  "faq": [],
  "internalLinks": [],
  "externalLinks": [],
  "answerCapsule": "...",
  "quickAnswer": "...",
  "keyFacts": [],
  "differentiator": "..."
}`;
}

function parseAttractionResult(
  data: any,
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions
): GeneratedPage {
  const pageId = `attraction_${entity.id}_${Date.now().toString(36)}`;
  const slug = generateSlug(entity.name, destination);

  return {
    id: pageId,
    type: 'attraction',
    sourceEntityId: entity.id,
    content: {
      title: data.title || entity.name,
      subtitle: data.subtitle,
      blocks: parseBlocks(data.blocks || []),
      quickInfo: parseQuickInfo(data.quickInfo || []),
      highlights: parseHighlights(data.highlights || []),
      faq: parseFaq(data.faq || []),
      images: buildImages(entity),
    },
    metadata: {
      slug,
      status: 'draft',
      locale: options.locale || 'en',
      destination,
      category: entity.type,
      tags: data.secondaryKeywords || [],
      relatedPages: [],
    },
    seoData: {
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription || entity.description,
      primaryKeyword: data.primaryKeyword || entity.name,
      secondaryKeywords: data.secondaryKeywords || [],
      schema: buildAttractionSchema(entity, data),
    },
    aeoData: {
      answerCapsule: data.answerCapsule || '',
      quickAnswer: data.quickAnswer || '',
      keyFacts: data.keyFacts || [],
      differentiator: data.differentiator || '',
    },
    generatedAt: new Date(),
    processingTime: 0,
  };
}

// ============================================================================
// Neighborhood Page Generator
// ============================================================================

async function generateNeighborhoodPage(
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions,
  providers: ReturnType<typeof getAllUnifiedProviders>
): Promise<GeneratedPage | null> {
  const prompt = `Create a neighborhood guide page for "${entity.name}" in ${destination}.

DATA:
${JSON.stringify({
  name: entity.name,
  description: entity.description,
  characteristics: (entity as any).characteristics,
  knownFor: (entity as any).knownFor,
  atmosphere: (entity as any).atmosphere,
}, null, 2)}

Generate content including:
1. Introduction (100-150 words)
2. H2 Sections (each 200-400 words with image placeholder):
   - Neighborhood Overview
   - Things to Do
   - Where to Eat & Drink
   - Where to Stay
   - Getting Around
3. Quick info bar
4. Highlights (5-8)
5. FAQ (5-7 questions with detailed answers)
6. Conclusion (100-150 words)
7. AEO answer capsule
8. Internal links (5-8)
9. External links (2-3)

Response JSON structure:
{
  "title": "...",
  "subtitle": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "primaryKeyword": "...",
  "secondaryKeywords": [],
  "blocks": [],
  "quickInfo": [],
  "highlights": [],
  "faq": [],
  "internalLinks": [],
  "externalLinks": [],
  "answerCapsule": "...",
  "quickAnswer": "...",
  "keyFacts": [],
  "differentiator": "..."
}`;

  const systemPrompt = 'You are an expert travel writer creating neighborhood guides. Generate 1800-2500 words of engaging, SEO-optimized content. Output valid JSON only.';
  const result = await generateAICompletion(systemPrompt, prompt, { maxTokens: 4000 });
  if (!result) {
    octopusLogger.warn('Neighborhood generation failed - no result');
    return null;
  }

  try {
    const parsed = JSON.parse(result);
    return parseNeighborhoodResult(parsed, entity, destination, options);
  } catch (error) {
    octopusLogger.error('Failed to parse neighborhood generation result', { error });
    return null;
  }
}

function parseNeighborhoodResult(
  data: any,
  entity: WebEnrichedEntity,
  destination: string,
  options: GenerationOptions
): GeneratedPage {
  const pageId = `neighborhood_${entity.id}_${Date.now().toString(36)}`;
  const slug = generateSlug(entity.name, destination);

  return {
    id: pageId,
    type: 'neighborhood',
    sourceEntityId: entity.id,
    content: {
      title: data.title || entity.name,
      subtitle: data.subtitle,
      blocks: parseBlocks(data.blocks || []),
      quickInfo: parseQuickInfo(data.quickInfo || []),
      highlights: parseHighlights(data.highlights || []),
      faq: parseFaq(data.faq || []),
      images: buildImages(entity),
    },
    metadata: {
      slug,
      status: 'draft',
      locale: options.locale || 'en',
      destination,
      category: 'neighborhoods',
      tags: data.secondaryKeywords || [],
      relatedPages: [],
    },
    seoData: {
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription || entity.description,
      primaryKeyword: data.primaryKeyword || entity.name,
      secondaryKeywords: data.secondaryKeywords || [],
      schema: {},
    },
    aeoData: {
      answerCapsule: data.answerCapsule || '',
      quickAnswer: data.quickAnswer || '',
      keyFacts: data.keyFacts || [],
      differentiator: data.differentiator || '',
    },
    generatedAt: new Date(),
    processingTime: 0,
  };
}

// ============================================================================
// Template-Based Article Generator (NEW)
// ============================================================================

/**
 * Generate an article based on a content template
 */
export async function generateArticleFromTemplate(
  template: ContentTemplate,
  entity: string,
  destination: string,
  options: GenerationOptions = {}
): Promise<GeneratedArticle | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const prompt = buildTemplatePrompt(template, entity, destination, opts);
  const systemPrompt = buildTemplateSystemPrompt(template);

  // Use queue-based generation if enabled
  if (useQueueForGeneration) {
    try {
      const result = await queuedAIRequest({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 6000,
        responseFormat: { type: 'json_object' },
      }, RequestPriority.NORMAL);

      const parsed = JSON.parse(result.content);
      return parseTemplateResult(parsed, template, entity, destination);
    } catch (error) {
      octopusLogger.error('Queued template generation failed', { template: template.id, error });
      return null;
    }
  }

  // Fallback to direct provider calls
  const providers = getAllUnifiedProviders();
  if (providers.length === 0) {
    throw new Error('No AI provider available for content generation');
  }

  for (const provider of providers) {
    try {
      const result = await provider.generateCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 6000,
        responseFormat: { type: 'json_object' },
      });

      const parsed = JSON.parse(result.content);
      return parseTemplateResult(parsed, template, entity, destination);
    } catch (error) {
      octopusLogger.warn('Template generation failed with provider', { provider: provider.name, template: template.id, error });
      continue;
    }
  }

  return null;
}

function buildTemplateSystemPrompt(template: ContentTemplate): string {
  return `You are an expert travel content writer creating ${template.name} content.

REQUIREMENTS:
- Generate ${template.wordCountRange.min}-${template.wordCountRange.max} words total
- Include all required sections with proper word counts
- Each H2 section: 200-400 words
- Introduction: 100-150 words
- Conclusion: 100-150 words
- FAQ: 5-8 questions with detailed 50-100 word answers
- Include image placeholders with descriptive alt text for each H2 section
- Suggest ${template.internalLinkCount.min}-${template.internalLinkCount.max} internal links
- Suggest ${template.externalLinkCount.min}-${template.externalLinkCount.max} external links
- Optimize for SEO and AEO (AI Answer Engines)
- Use engaging, natural language

Output valid JSON only.`;
}

function buildTemplatePrompt(
  template: ContentTemplate,
  entity: string,
  destination: string,
  options: GenerationOptions
): string {
  const sectionDescriptions = template.sections
    .map((s, i) => `${i + 1}. ${s.type}${s.title ? `: "${s.title}"` : ''} (${s.wordCount} words)${s.includeImage ? ' [include image]' : ''}`)
    .join('\n');

  return `Create a comprehensive ${template.name} about "${entity}" in ${destination}.

TEMPLATE STRUCTURE:
${sectionDescriptions}

REQUIRED ELEMENTS: ${template.requiredElements.join(', ')}

TONE: ${options.tone}
TARGET WORD COUNT: ${template.wordCountRange.min}-${template.wordCountRange.max} words

Generate complete JSON response:
{
  "title": "SEO-optimized title (50-60 chars)",
  "metaTitle": "Meta title for search (50-60 chars)",
  "metaDescription": "Meta description (150-160 chars)",
  "sections": [
    {
      "type": "intro",
      "content": "100-150 word engaging introduction..."
    },
    {
      "type": "h2_section",
      "title": "Section Title",
      "content": "200-400 word detailed content...",
      "image": {
        "alt": "Descriptive alt text",
        "caption": "Image caption",
        "suggestedQuery": "search query for image"
      }
    },
    ...more sections following template...
    {
      "type": "faq",
      "items": [
        { "question": "...", "answer": "50-100 word answer" }
      ]
    },
    {
      "type": "conclusion",
      "content": "100-150 word conclusion with CTA..."
    }
  ],
  "internalLinks": [
    { "anchor": "anchor text", "suggestedUrl": "/path", "context": "where to place" }
  ],
  "externalLinks": [
    { "anchor": "anchor text", "context": "reason for link" }
  ],
  "aeoData": {
    "answerCapsule": "40-60 word answer capsule",
    "quickAnswer": "One sentence answer",
    "keyFacts": ["fact1", "fact2", "fact3", "fact4"],
    "differentiator": "What makes this unique"
  }
}`;
}

function parseTemplateResult(
  data: any,
  template: ContentTemplate,
  entity: string,
  destination: string
): GeneratedArticle {
  const articleId = `${template.id}_${Date.now().toString(36)}`;
  
  const sections: GeneratedSection[] = (data.sections || []).map((s: any, index: number) => ({
    type: s.type,
    title: s.title,
    content: s.content || (s.items ? s.items.map((item: any) => `Q: ${item.question}\nA: ${item.answer}`).join('\n\n') : ''),
    wordCount: (s.content || '').split(/\s+/).length,
    image: s.image ? {
      id: `img_${index}`,
      alt: s.image.alt || generateImageAltText(s.title || 'Section', entity, destination),
      caption: s.image.caption,
      suggestedQuery: s.image.suggestedQuery || `${entity} ${s.title}`,
      placement: 'section' as const,
    } : undefined,
  }));

  const fullContent = sections.map(s => s.content).join('\n\n');
  const wordCount = fullContent.split(/\s+/).length;

  const images: ImagePlaceholder[] = [
    {
      id: 'hero',
      alt: generateImageAltText('Hero', entity, destination),
      suggestedQuery: `${entity} ${destination} hero`,
      placement: 'hero',
    },
    ...sections.filter(s => s.image).map(s => s.image!),
  ];

  const faqSection = data.sections?.find((s: any) => s.type === 'faq');
  const faq: FaqItem[] = faqSection?.items || generateFaqItems(entity, destination, template.type);

  return {
    id: articleId,
    templateId: template.id,
    title: data.title || `${template.name}: ${entity} in ${destination}`,
    metaTitle: data.metaTitle || data.title,
    metaDescription: data.metaDescription || '',
    content: fullContent,
    wordCount,
    sections,
    internalLinks: (data.internalLinks || []).map((link: any) => ({
      type: 'internal' as const,
      anchor: link.anchor,
      suggestedUrl: link.suggestedUrl,
      context: link.context,
    })),
    externalLinks: (data.externalLinks || []).map((link: any) => ({
      type: 'external' as const,
      anchor: link.anchor,
      context: link.context,
    })),
    images,
    faq,
    aeoData: {
      answerCapsule: data.aeoData?.answerCapsule || '',
      quickAnswer: data.aeoData?.quickAnswer || '',
      keyFacts: data.aeoData?.keyFacts || [],
      differentiator: data.aeoData?.differentiator || '',
    },
    generatedAt: new Date(),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateSlug(name: string, destination: string): string {
  const combined = `${name} ${destination}`.toLowerCase();
  return combined
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

function parseBlocks(blocks: any[]): ContentBlock[] {
  return blocks.map((block, index) => ({
    id: `block_${index}`,
    type: block.type || 'text',
    content: block.content || '',
    items: block.items,
    heading: block.heading,
  })) as ContentBlock[];
}

function parseQuickInfo(items: any[]): QuickInfoItem[] {
  return items.map(item => ({
    icon: item.icon || 'info',
    label: item.label || '',
    value: item.value || '',
  }));
}

function parseHighlights(items: any[]): HighlightItem[] {
  return items.map(item => ({
    icon: item.icon || 'star',
    title: item.title || '',
    text: item.text || item.description || '',
  }));
}

function parseFaq(items: any[]): FaqItem[] {
  return items.map(item => ({
    question: item.question || item.q || '',
    answer: item.answer || item.a || '',
  }));
}

function buildImages(entity: WebEnrichedEntity): PageImage[] {
  const images: PageImage[] = [];

  if (entity.googleMapsData?.photos) {
    entity.googleMapsData.photos.slice(0, 5).forEach((photo, index) => {
      images.push({
        url: photo,
        alt: `${entity.name} - Image ${index + 1}`,
        type: index === 0 ? 'hero' : 'gallery',
      });
    });
  }

  return images;
}

function buildHotelSchema(entity: WebEnrichedEntity, data: any): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: entity.name,
    description: data.metaDescription,
    address: entity.location?.address,
    geo: entity.googleMapsData?.coordinates ? {
      '@type': 'GeoCoordinates',
      latitude: entity.googleMapsData.coordinates.lat,
      longitude: entity.googleMapsData.coordinates.lng,
    } : undefined,
    aggregateRating: entity.googleMapsData?.rating ? {
      '@type': 'AggregateRating',
      ratingValue: entity.googleMapsData.rating,
      reviewCount: entity.googleMapsData.reviewCount,
    } : undefined,
  };
}

function buildRestaurantSchema(entity: WebEnrichedEntity, data: any): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: entity.name,
    description: data.metaDescription,
    address: entity.location?.address,
    servesCuisine: (entity as any).cuisineType,
    priceRange: (entity as any).priceRange,
    aggregateRating: entity.googleMapsData?.rating ? {
      '@type': 'AggregateRating',
      ratingValue: entity.googleMapsData.rating,
      reviewCount: entity.googleMapsData.reviewCount,
    } : undefined,
  };
}

function buildAttractionSchema(entity: WebEnrichedEntity, data: any): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: entity.name,
    description: data.metaDescription,
    address: entity.location?.address,
    geo: entity.googleMapsData?.coordinates ? {
      '@type': 'GeoCoordinates',
      latitude: entity.googleMapsData.coordinates.lat,
      longitude: entity.googleMapsData.coordinates.lng,
    } : undefined,
  };
}

/**
 * Get generation statistics
 */
export function getGenerationStats(result: BatchGenerationResult): {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  byType: Record<string, number>;
  avgProcessingTime: number;
} {
  const byType: Record<string, number> = {};
  let totalTime = 0;

  for (const page of result.pages) {
    byType[page.type] = (byType[page.type] || 0) + 1;
    totalTime += page.processingTime;
  }

  return {
    total: result.successCount + result.failedCount,
    success: result.successCount,
    failed: result.failedCount,
    successRate: Math.round((result.successCount / (result.successCount + result.failedCount)) * 100),
    byType,
    avgProcessingTime: result.pages.length > 0 ? Math.round(totalTime / result.pages.length) : 0,
  };
}

