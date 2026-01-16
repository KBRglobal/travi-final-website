/**
 * Phase 6: AEO (Answer Engine Optimization) Generator
 * 
 * Generates AI-optimized content for answer engines:
 * - answerCapsule: 40-60 word concise summary
 * - FAQ: 5-8 Q&A pairs
 * - JSON-LD schema markup
 * - Quick Facts / Key Takeaways
 * 
 * CONSTRAINTS:
 * - Deterministic output (low temperature, strict schemas)
 * - No hallucinated facts or fake statistics
 * - Must reference structured data from entity fields
 */

import { db } from '../db';
import { 
  contents,
  hotels,
  attractions,
  destinations,
  districts,
  type Content,
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { log } from '../lib/logger';
import { z } from 'zod';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[AEOGenerator] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => 
    log.error(`[AEOGenerator] ${msg}`, undefined, data),
};

// AEO Configuration
const CONFIG = {
  ANSWER_CAPSULE_MIN_WORDS: 40,
  ANSWER_CAPSULE_MAX_WORDS: 60,
  FAQ_MIN_ITEMS: 5,
  FAQ_MAX_ITEMS: 8,
  TEMPERATURE: 0.1, // Low for determinism
};

// Validation schemas
const AnswerCapsuleSchema = z.object({
  capsule: z.string().min(100).max(500),
});

const FaqItemSchema = z.object({
  question: z.string().min(10),
  answer: z.string().min(30).max(300),
});

const FaqSchema = z.object({
  items: z.array(FaqItemSchema).min(5).max(8),
});

// JSON-LD Schema types
type JsonLdType = 'Hotel' | 'TouristAttraction' | 'Restaurant' | 'Article' | 'WebPage';

/**
 * Generate answer capsule for content
 * 40-60 words, factual, no marketing fluff
 */
export async function generateAnswerCapsule(
  contentId: string
): Promise<string | null> {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!content) {
    logger.error('Content not found', { contentId });
    return null;
  }

  // Gather structured data based on content type
  const entityData = await gatherEntityData(content);
  
  const prompt = buildAnswerCapsulePrompt(content, entityData);
  
  try {
    const response = await callAI(prompt, AnswerCapsuleSchema);
    
    // Validate word count
    const wordCount = response.capsule.split(/\s+/).length;
    if (wordCount < CONFIG.ANSWER_CAPSULE_MIN_WORDS || wordCount > CONFIG.ANSWER_CAPSULE_MAX_WORDS) {
      logger.error('Answer capsule word count out of range', { contentId, wordCount });
      return null;
    }

    // Update content with answer capsule
    await db.update(contents).set({
      answerCapsule: response.capsule,
    }).where(eq(contents.id, contentId));

    logger.info('Answer capsule generated', { contentId, wordCount });
    return response.capsule;
  } catch (error) {
    logger.error('Failed to generate answer capsule', { 
      contentId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

/**
 * Generate FAQ for content
 * 5-8 Q&A pairs matching user intent
 */
export async function generateFaq(
  contentId: string
): Promise<Array<{ question: string; answer: string }> | null> {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!content) {
    logger.error('Content not found', { contentId });
    return null;
  }

  const entityData = await gatherEntityData(content);
  const prompt = buildFaqPrompt(content, entityData);
  
  try {
    const response = await callAI(prompt, FaqSchema);
    
    // Update entity with FAQ (stored on entity tables, not contents)
    await updateEntityFaq(content, response.items);

    logger.info('FAQ generated', { contentId, items: response.items.length });
    return response.items;
  } catch (error) {
    logger.error('Failed to generate FAQ', { 
      contentId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

/**
 * Generate JSON-LD schema for content
 */
export async function generateJsonLd(
  contentId: string
): Promise<Record<string, unknown> | null> {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!content) {
    logger.error('Content not found', { contentId });
    return null;
  }

  const entityData = await gatherEntityData(content);
  const schemaType = determineSchemaType(content);
  
  const schema = buildJsonLdSchema(content, entityData, schemaType);
  
  // Update content with schema
  await db.update(contents).set({
    seoSchema: schema,
  }).where(eq(contents.id, contentId));

  logger.info('JSON-LD generated', { contentId, type: schemaType });
  return schema;
}

/**
 * Calculate AEO score based on content completeness
 */
export async function calculateAeoScore(contentId: string): Promise<number> {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!content) return 0;

  let score = 0;

  // Answer capsule (30 points)
  if (content.answerCapsule) {
    const wordCount = content.answerCapsule.split(/\s+/).length;
    if (wordCount >= 40 && wordCount <= 60) score += 30;
    else if (wordCount >= 30) score += 15;
  }

  // JSON-LD schema (25 points)
  if (content.seoSchema && Object.keys(content.seoSchema).length > 0) {
    score += 25;
  }

  // Meta tags (20 points)
  if (content.metaTitle) score += 10;
  if (content.metaDescription) score += 10;

  // Content blocks (15 points)
  if (content.blocks && content.blocks.length > 0) {
    score += 15;
  }

  // FAQ (10 points) - check entity tables
  const entityData = await gatherEntityData(content);
  if (entityData.faq && entityData.faq.length >= 5) {
    score += 10;
  }

  // Update score
  await db.update(contents).set({
    aeoScore: score,
  }).where(eq(contents.id, contentId));

  return score;
}

/**
 * Gather entity-specific data for AEO generation
 */
async function gatherEntityData(content: Content): Promise<{
  type: string;
  destination?: { name: string; country?: string };
  district?: { name: string };
  hotel?: { starRating?: number; amenities?: string[] };
  attraction?: { category?: string; duration?: string };
  faq?: Array<{ question: string; answer: string }>;
}> {
  const entityData: ReturnType<typeof gatherEntityData> extends Promise<infer T> ? T : never = {
    type: content.type || 'article',
  };

  // Get entity-specific data to find destination
  const [hotel] = await db.select().from(hotels).where(eq(hotels.contentId, content.id));
  if (hotel) {
    entityData.type = 'hotel';
    entityData.hotel = {
      starRating: hotel.starRating ?? undefined,
    };
    entityData.faq = hotel.faq || undefined;

    // Get destination from hotel
    if (hotel.destinationId) {
      const [dest] = await db.select().from(destinations).where(eq(destinations.id, hotel.destinationId));
      if (dest) {
        entityData.destination = { 
          name: dest.name,
          country: dest.country || undefined,
        };
      }
    }
  }

  const [attraction] = await db.select().from(attractions).where(eq(attractions.contentId, content.id));
  if (attraction) {
    entityData.type = 'attraction';
    entityData.faq = attraction.faq || undefined;
    
    // Get destination from attraction
    if (attraction.destinationId) {
      const [dest] = await db.select().from(destinations).where(eq(destinations.id, attraction.destinationId));
      if (dest) {
        entityData.destination = { 
          name: dest.name,
          country: dest.country || undefined,
        };
      }
    }
  }

  return entityData;
}

/**
 * Build answer capsule prompt
 */
function buildAnswerCapsulePrompt(
  content: Content,
  entityData: Awaited<ReturnType<typeof gatherEntityData>>
): string {
  const context = [];
  
  if (entityData.destination) {
    context.push(`Located in ${entityData.destination.name}`);
  }
  if (entityData.district) {
    context.push(`in the ${entityData.district.name} area`);
  }
  if (entityData.hotel?.starRating) {
    context.push(`${entityData.hotel.starRating}-star hotel`);
  }

  return `Generate a concise answer capsule (40-60 words) for an AI answer engine.

Content Title: ${content.title}
Type: ${entityData.type}
${context.length > 0 ? `Context: ${context.join(', ')}` : ''}
${content.metaDescription ? `Description: ${content.metaDescription}` : ''}

RULES:
- Must be factual and specific
- No marketing language or superlatives
- Do not invent statistics or claims
- Reference the entity name and location
- Suitable for AI assistant responses

Return JSON: { "capsule": "..." }`;
}

/**
 * Build FAQ prompt
 */
function buildFaqPrompt(
  content: Content,
  entityData: Awaited<ReturnType<typeof gatherEntityData>>
): string {
  let specificQuestions = '';
  
  if (entityData.type === 'hotel') {
    specificQuestions = `
Focus on:
- Check-in/check-out times (if unknown, omit)
- Best for what type of travelers
- Location and neighborhood
- Key amenities
- Nearby attractions or highlights`;
  } else if (entityData.type === 'attraction') {
    specificQuestions = `
Focus on:
- Best time to visit
- Duration of visit
- Tickets or entry requirements (if known)
- What to expect
- Accessibility or suitability`;
  } else {
    specificQuestions = `
Focus on:
- Key highlights
- Who this is best for
- What to know before visiting
- Practical information`;
  }

  return `Generate 5-8 FAQ items for "${content.title}".

Type: ${entityData.type}
${entityData.destination ? `Location: ${entityData.destination.name}` : ''}
${content.metaDescription ? `About: ${content.metaDescription}` : ''}
${specificQuestions}

RULES:
- Questions must match real user search intent
- Answers must be concise (30-100 words)
- Do NOT invent facts, statistics, or specific numbers
- If information is unknown, omit that question
- Keep answers helpful and factual

Return JSON: { "items": [{ "question": "...", "answer": "..." }, ...] }`;
}

/**
 * Determine JSON-LD schema type
 */
function determineSchemaType(content: Content): JsonLdType {
  switch (content.type) {
    case 'hotel':
      return 'Hotel';
    case 'attraction':
      return 'TouristAttraction';
    case 'dining':
      return 'Restaurant';
    case 'article':
      return 'Article';
    default:
      return 'WebPage';
  }
}

/**
 * Build JSON-LD schema
 */
function buildJsonLdSchema(
  content: Content,
  entityData: Awaited<ReturnType<typeof gatherEntityData>>,
  schemaType: JsonLdType
): Record<string, unknown> {
  const baseSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: content.title,
    description: content.metaDescription || undefined,
    url: content.slug ? `/${content.slug}` : undefined,
  };

  // Add address if destination available
  if (entityData.destination) {
    baseSchema.address = {
      '@type': 'PostalAddress',
      addressLocality: entityData.destination.name,
      addressCountry: entityData.destination.country || 'AE',
    };
  }

  // Type-specific additions
  if (schemaType === 'Hotel' && entityData.hotel) {
    if (entityData.hotel.starRating) {
      baseSchema.starRating = {
        '@type': 'Rating',
        ratingValue: entityData.hotel.starRating,
      };
    }
  }

  // Add FAQ schema if available
  if (entityData.faq && entityData.faq.length > 0) {
    baseSchema.mainEntity = {
      '@type': 'FAQPage',
      mainEntity: entityData.faq.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };
  }

  return baseSchema;
}

/**
 * Update entity FAQ (hotels or attractions)
 */
async function updateEntityFaq(
  content: Content,
  faqItems: Array<{ question: string; answer: string }>
): Promise<void> {
  // Update hotel FAQ
  const [hotel] = await db.select().from(hotels).where(eq(hotels.contentId, content.id));
  if (hotel) {
    await db.update(hotels).set({ faq: faqItems }).where(eq(hotels.id, hotel.id));
    return;
  }

  // Update attraction FAQ
  const [attraction] = await db.select().from(attractions).where(eq(attractions.contentId, content.id));
  if (attraction) {
    await db.update(attractions).set({ faq: faqItems }).where(eq(attractions.id, attraction.id));
  }
}

/**
 * Call AI with structured output
 */
async function callAI<T extends z.ZodType>(
  prompt: string,
  schema: T
): Promise<z.infer<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY || 
                 process.env.OPENAI_API_KEY || 
                 process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('No AI API key configured');
  }

  // Try Anthropic first
  if (process.env.ANTHROPIC_API_KEY) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: CONFIG.TEMPERATURE,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return schema.parse(parsed);
  }

  // Fallback to OpenAI
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: CONFIG.TEMPERATURE,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(text);
  return schema.parse(parsed);
}

/**
 * Run full AEO generation for content
 */
export async function generateFullAeo(contentId: string): Promise<{
  answerCapsule: string | null;
  faq: Array<{ question: string; answer: string }> | null;
  jsonLd: Record<string, unknown> | null;
  aeoScore: number;
}> {
  logger.info('Starting full AEO generation', { contentId });

  const [answerCapsule, faq, jsonLd] = await Promise.all([
    generateAnswerCapsule(contentId),
    generateFaq(contentId),
    generateJsonLd(contentId),
  ]);

  const aeoScore = await calculateAeoScore(contentId);

  logger.info('Full AEO generation complete', { contentId, aeoScore });

  return { answerCapsule, faq, jsonLd, aeoScore };
}
