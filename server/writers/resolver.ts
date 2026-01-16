/**
 * Writer Persona System - Persona Resolver
 *
 * Selects appropriate persona based on context.
 */

import { PersonaName, PromptContext, WriterPersona } from './types';
import { getPersona, personaExists, PERSONAS } from './personas';

/**
 * Content type to persona mapping.
 */
const CONTENT_TYPE_PERSONAS: Record<string, PersonaName> = {
  news: 'journalist',
  article: 'journalist',
  blog: 'conversational',
  guide: 'travel_guide',
  review: 'travel_guide',
  analysis: 'authority',
  research: 'authority',
  seo: 'seo_expert',
  landing: 'seo_expert',
  faq: 'conversational',
};

/**
 * Keyword hints to persona mapping.
 */
const KEYWORD_HINTS: Record<string, PersonaName> = {
  'how to': 'travel_guide',
  'best': 'travel_guide',
  'guide': 'travel_guide',
  'tips': 'conversational',
  'review': 'authority',
  'analysis': 'authority',
  'expert': 'authority',
  'breaking': 'journalist',
  'news': 'journalist',
  'update': 'journalist',
};

/**
 * Resolve persona from explicit name.
 */
export function resolvePersonaByName(name: string): WriterPersona {
  if (personaExists(name)) {
    return getPersona(name);
  }
  return getPersona('default');
}

/**
 * Resolve persona from context.
 */
export function resolvePersonaFromContext(context: PromptContext): WriterPersona {
  // Check content type first
  if (context.contentType) {
    const typeMatch = CONTENT_TYPE_PERSONAS[context.contentType.toLowerCase()];
    if (typeMatch) {
      return getPersona(typeMatch);
    }
  }

  // Check topic/keywords for hints
  const topicLower = context.topic.toLowerCase();
  const keywords = context.keywords?.map(k => k.toLowerCase()) || [];
  const allText = [topicLower, ...keywords].join(' ');

  for (const [hint, persona] of Object.entries(KEYWORD_HINTS)) {
    if (allText.includes(hint)) {
      return getPersona(persona);
    }
  }

  // Default based on locale
  if (context.locale === 'ar') {
    // Arabic content might benefit from more formal style
    return getPersona('authority');
  }

  return getPersona('default');
}

/**
 * Resolve persona with optional explicit override.
 */
export function resolvePersona(
  explicitPersona: string | undefined,
  context: PromptContext
): WriterPersona {
  // Explicit persona takes priority
  if (explicitPersona && personaExists(explicitPersona)) {
    return getPersona(explicitPersona as PersonaName);
  }

  // Fall back to context-based resolution
  return resolvePersonaFromContext(context);
}

/**
 * Get persona recommendations for a topic.
 */
export function getPersonaRecommendations(
  context: PromptContext
): Array<{ persona: WriterPersona; reason: string }> {
  const recommendations: Array<{ persona: WriterPersona; reason: string }> = [];

  const topicLower = context.topic.toLowerCase();

  // Travel-related topics
  if (
    topicLower.includes('travel') ||
    topicLower.includes('visit') ||
    topicLower.includes('destination') ||
    topicLower.includes('hotel') ||
    topicLower.includes('restaurant')
  ) {
    recommendations.push({
      persona: getPersona('travel_guide'),
      reason: 'Topic appears to be travel-related',
    });
  }

  // News/current events
  if (
    topicLower.includes('news') ||
    topicLower.includes('update') ||
    topicLower.includes('announcement')
  ) {
    recommendations.push({
      persona: getPersona('journalist'),
      reason: 'Topic appears to be news-related',
    });
  }

  // How-to/guides
  if (topicLower.includes('how to') || topicLower.includes('guide')) {
    recommendations.push({
      persona: getPersona('conversational'),
      reason: 'How-to content works well with friendly tone',
    });
  }

  // Analysis/expert content
  if (
    topicLower.includes('analysis') ||
    topicLower.includes('review') ||
    topicLower.includes('compare')
  ) {
    recommendations.push({
      persona: getPersona('authority'),
      reason: 'Analysis content benefits from expert perspective',
    });
  }

  // SEO focus
  if (context.keywords && context.keywords.length > 2) {
    recommendations.push({
      persona: getPersona('seo_expert'),
      reason: 'Multiple keywords suggest SEO optimization needed',
    });
  }

  // Always include default
  recommendations.push({
    persona: getPersona('default'),
    reason: 'Balanced approach for general content',
  });

  return recommendations;
}

/**
 * Check if persona is suitable for content type.
 */
export function isPersonaSuitable(
  persona: PersonaName,
  contentType: string
): boolean {
  const recommended = CONTENT_TYPE_PERSONAS[contentType.toLowerCase()];
  if (!recommended) return true; // No preference

  // Check if selected persona is suitable
  const suitablePairs: Record<PersonaName, PersonaName[]> = {
    journalist: ['journalist', 'authority', 'default'],
    seo_expert: ['seo_expert', 'default', 'conversational'],
    travel_guide: ['travel_guide', 'conversational', 'default'],
    conversational: ['conversational', 'travel_guide', 'default'],
    authority: ['authority', 'journalist', 'default'],
    default: Object.keys(PERSONAS) as PersonaName[],
  };

  return suitablePairs[persona]?.includes(recommended) ?? true;
}
