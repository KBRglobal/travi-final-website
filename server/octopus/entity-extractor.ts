/**
 * Octopus Engine - Entity Extraction Service
 * Uses AI to extract travel entities from parsed documents
 * Hotels, Restaurants, Attractions, Neighborhoods, etc.
 * 
 * UPGRADED for maximum entity extraction (target: 50+ entities per document)
 */

import { getAllUnifiedProviders, type AIMessage } from '../ai/providers';
import { categorizedAIRequest, getQueueStats, AITaskRejectionError, type AITaskCategory } from '../ai/request-queue';
import type { ParsedDocument, DocumentSection } from './document-parser';
import { log } from '../lib/logger';
import { getCreditGuard } from '../ai-orchestrator/credit-guard';

const octopusLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Octopus Extractor] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Octopus Extractor] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Octopus Extractor] ${msg}`, data),
};

/**
 * PHASE 14: AI task category for entity extraction operations
 */
const EXTRACTION_CATEGORY: AITaskCategory = 'enrichment';

/**
 * PHASE 14: Wrapper for AI requests with rejection handling
 * Surfaces rejection reasons and logs structured events
 */
async function safeAIRequest(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' | 'text' };
  },
  context: {
    operation: string;
    batchIndex?: number;
    totalBatches?: number;
  }
): Promise<{ content: string; provider: string }> {
  const taskId = `extract_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  // PHASE 14: Check credit guard before making request
  const creditGuard = getCreditGuard();
  const guardCheck = creditGuard.check('anthropic', EXTRACTION_CATEGORY);
  
  if (guardCheck.threshold === 'warning' || guardCheck.threshold === 'soft-disable') {
    octopusLogger.warn('Credit guard warning during extraction', {
      taskId,
      operation: context.operation,
      threshold: guardCheck.threshold,
      usagePercent: guardCheck.usagePercent,
      reason: guardCheck.reason,
    });
  }
  
  if (guardCheck.threshold === 'blocked' && !creditGuard.isObserveOnly()) {
    // PHASE 14: Structured rejection log
    octopusLogger.error('[AI] Task rejected - credit guard blocked', {
      taskId,
      provider: 'anthropic',
      category: EXTRACTION_CATEGORY,
      reason: guardCheck.reason || 'Credit limit exceeded',
    });
    
    throw new AITaskRejectionError(
      taskId,
      EXTRACTION_CATEGORY,
      guardCheck.reason || 'Credit limit exceeded',
      'anthropic'
    );
  }
  
  try {
    const result = await categorizedAIRequest(
      {
        messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        responseFormat: options.responseFormat,
      },
      {
        category: EXTRACTION_CATEGORY,
        priority: 5, // Normal priority
      }
    );
    
    return result;
  } catch (error: any) {
    // PHASE 14: Capture and re-throw with structured logging
    const isRejection = error instanceof AITaskRejectionError;
    
    octopusLogger.error('[AI] Task rejected during extraction', {
      taskId,
      provider: error.provider || 'unknown',
      category: EXTRACTION_CATEGORY,
      reason: error.message,
      operation: context.operation,
      batchIndex: context.batchIndex,
      isRejection,
    });
    
    // Re-throw to let caller handle job failure
    throw error;
  }
}

// ============================================================================
// Entity Types - EXPANDED for maximum extraction
// ============================================================================

export interface BaseEntity {
  id: string;
  type: EntityType;
  name: string;
  nameLocal?: string;
  description: string;
  location?: EntityLocation;
  confidence: number;
  sourceSection: number;
  rawMentions: string[];
}

export interface EntityLocation {
  address?: string;
  neighborhood?: string;
  city?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
}

export type EntityType =
  | 'hotel'
  | 'restaurant'
  | 'attraction'
  | 'neighborhood'
  | 'beach'
  | 'mall'
  | 'museum'
  | 'park'
  | 'landmark'
  | 'transport'
  | 'event'
  | 'temple'
  | 'bar'
  | 'rooftop'
  | 'market'
  | 'spa'
  | 'cafe'
  | 'club'
  | 'transit_hub'
  | 'hospital'
  | 'festival'
  | 'shopping_district';

export const ALL_ENTITY_TYPES: EntityType[] = [
  'hotel', 'restaurant', 'attraction', 'neighborhood', 'beach', 'mall', 
  'museum', 'park', 'landmark', 'transport', 'event', 'temple', 'bar', 
  'rooftop', 'market', 'spa', 'cafe', 'club', 'transit_hub', 'hospital', 
  'festival', 'shopping_district'
];

export interface HotelEntity extends BaseEntity {
  type: 'hotel';
  starRating?: number;
  priceRange?: string;
  amenities?: string[];
  roomTypes?: string[];
  targetAudience?: string[];
}

export interface RestaurantEntity extends BaseEntity {
  type: 'restaurant';
  cuisineType?: string[];
  priceRange?: string;
  diningStyle?: string;
  specialties?: string[];
  openingHours?: string;
}

export interface AttractionEntity extends BaseEntity {
  type: 'attraction' | 'beach' | 'mall' | 'museum' | 'park' | 'landmark' | 'temple' | 'market' | 'rooftop' | 'spa' | 'cafe' | 'bar' | 'club' | 'transit_hub' | 'hospital' | 'festival' | 'shopping_district';
  category?: string;
  duration?: string;
  ticketPrice?: string;
  bestTimeToVisit?: string;
  highlights?: string[];
}

export interface NeighborhoodEntity extends BaseEntity {
  type: 'neighborhood';
  characteristics?: string[];
  knownFor?: string[];
  atmosphere?: string;
}

export type ExtractedEntity = HotelEntity | RestaurantEntity | AttractionEntity | NeighborhoodEntity;

export interface ExtractionResult {
  documentId: string;
  destination?: string;
  entities: ExtractedEntity[];
  summary: {
    totalEntities: number;
    byType: Record<EntityType, number>;
    averageConfidence: number;
  };
  processingTime: number;
  aiProvider: string;
}

export interface ExtractionOptions {
  entityTypes?: EntityType[];
  minConfidence?: number;
  maxEntitiesPerType?: number;
  useQuickModel?: boolean;
  deepAnalysis?: boolean;
  sweepScan?: boolean;
}

const DEFAULT_OPTIONS: ExtractionOptions = {
  entityTypes: ALL_ENTITY_TYPES,
  minConfidence: 0.25,
  maxEntitiesPerType: 200,
  useQuickModel: true,
  deepAnalysis: true,
  sweepScan: true,
};

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract entities from a parsed document
 */
export async function extractEntities(
  document: ParsedDocument,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  octopusLogger.info('Starting AGGRESSIVE entity extraction', {
    filename: document.filename,
    sections: document.sections.length,
    totalWords: document.totalWords,
    targetEntityTypes: opts.entityTypes?.length,
  });

  const providers = getAllUnifiedProviders();
  if (providers.length === 0) {
    throw new Error('No AI provider available for entity extraction');
  }

  const allEntities: ExtractedEntity[] = [];
  let usedProvider = '';

  // Step 1: Quick scan with faster model (Haiku-equivalent)
  if (opts.useQuickModel) {
    const quickEntities = await quickEntityScan(document, opts, providers);
    allEntities.push(...quickEntities.entities);
    usedProvider = quickEntities.provider;
    octopusLogger.info('Quick scan complete', { entitiesFound: quickEntities.entities.length });
  }

  // Step 2: Deep analysis with more capable model (Sonnet-equivalent)
  if (opts.deepAnalysis && allEntities.length > 0) {
    const deepEntities = await deepEntityAnalysis(document, allEntities, opts, providers);
    mergeEntities(allEntities, deepEntities.entities);
    usedProvider = deepEntities.provider || usedProvider;
    octopusLogger.info('Deep analysis complete', { entitiesEnriched: deepEntities.entities.length });
  }

  // Step 3: SWEEP SCAN - Final pass to catch missed entities
  if (opts.sweepScan !== false) {
    const sweepEntities = await sweepScanForMissedEntities(document, allEntities, opts, providers);
    mergeEntities(allEntities, sweepEntities.entities);
    usedProvider = sweepEntities.provider || usedProvider;
    octopusLogger.info('Sweep scan complete', { additionalEntities: sweepEntities.entities.length });
  }

  // Filter by confidence
  const filteredEntities = allEntities.filter(e => e.confidence >= (opts.minConfidence || 0.25));

  // Detect destination
  const destination = detectDestination(document, filteredEntities);

  // Calculate summary
  const byType: Record<EntityType, number> = {} as any;
  for (const entity of filteredEntities) {
    byType[entity.type] = (byType[entity.type] || 0) + 1;
  }

  const avgConfidence = filteredEntities.length > 0
    ? filteredEntities.reduce((sum, e) => sum + e.confidence, 0) / filteredEntities.length
    : 0;

  const result: ExtractionResult = {
    documentId: generateDocumentId(document),
    destination,
    entities: filteredEntities,
    summary: {
      totalEntities: filteredEntities.length,
      byType,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
    },
    processingTime: Date.now() - startTime,
    aiProvider: usedProvider,
  };

  octopusLogger.info('Entity extraction complete', {
    documentId: result.documentId,
    totalEntities: result.summary.totalEntities,
    byType: result.summary.byType,
    processingTime: result.processingTime,
  });

  return result;
}

// ============================================================================
// Quick Scan (Haiku-equivalent) - AGGRESSIVE MODE
// ============================================================================

async function quickEntityScan(
  document: ParsedDocument,
  options: ExtractionOptions,
  providers: ReturnType<typeof getAllUnifiedProviders>
): Promise<{ entities: ExtractedEntity[]; provider: string }> {
  const entities: ExtractedEntity[] = [];
  let usedProvider = 'unknown';

  // Process sections in batches using the queue system (like eMule!)
  const batchSize = 3;
  const sections = document.sections;
  const totalBatches = Math.ceil(sections.length / batchSize);

  octopusLogger.info('Starting quick scan with queue system', {
    totalSections: sections.length,
    totalBatches,
    queueStats: getQueueStats(),
  });

  for (let i = 0; i < sections.length; i += batchSize) {
    const batchIndex = Math.floor(i / batchSize) + 1;
    const batch = sections.slice(i, i + batchSize);
    const batchText = batch.map(s => s.content).join('\n\n---\n\n');

    const prompt = buildQuickScanPrompt(batchText, options.entityTypes || ALL_ENTITY_TYPES);

    try {
      // PHASE 14: Use safeAIRequest with explicit category for rejection handling
      const result = await safeAIRequest(
        [
          { role: 'system', content: QUICK_SCAN_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        {
          temperature: 0.1,
          maxTokens: 8000,
          responseFormat: { type: 'json_object' },
        },
        {
          operation: 'quick_entity_scan',
          batchIndex,
          totalBatches,
        }
      );

      const parsed = JSON.parse(result.content);
      const batchEntities = parseQuickScanResult(parsed, batch[0].index);
      entities.push(...batchEntities);
      usedProvider = result.provider;

      octopusLogger.info('Batch processed via queue', {
        batchIndex,
        totalBatches,
        entitiesFound: batchEntities.length,
        provider: result.provider,
      });

    } catch (error: any) {
      // PHASE 14: Check if this is a rejection error
      const isRejection = error instanceof AITaskRejectionError;
      
      octopusLogger.error('Quick scan batch failed', {
        batchIndex,
        totalBatches,
        error: error.message,
        isRejection,
        category: EXTRACTION_CATEGORY,
      });
      
      // PHASE 14: If it's a rejection, throw to fail the job
      if (isRejection) {
        throw error;
      }
      // Continue with other batches for non-rejection errors
    }
  }

  return { entities, provider: usedProvider };
}

const QUICK_SCAN_SYSTEM_PROMPT = `You are an AGGRESSIVE entity extraction specialist for travel documents.
Your mission is to find EVERY SINGLE travel-related entity mentioned in the text - even if briefly mentioned.

EXTRACTION RULES - BE AGGRESSIVE:
1. Extract EVERY place, venue, or location mentioned - even if only mentioned once
2. Include entities with local names (Thai names like "Wat", Arabic names, Japanese names, etc.)
3. Street names, soi numbers, and districts should be extracted as neighborhoods
4. Extract bars, pubs, nightclubs, rooftop venues - nightlife is important!
5. Extract temples, shrines, mosques, churches as 'temple' type
6. Extract markets, bazaars, night markets, floating markets, shopping streets as 'market' type
7. Extract rooftop bars, sky bars, rooftop restaurants as 'rooftop' type
8. Extract cafes, coffee shops, tea houses as 'cafe' type
9. Extract spas, wellness centers, massage parlors as 'spa' type
10. Extract train stations, airports, bus terminals, ferry terminals as 'transit_hub' type
11. Extract festivals, events, celebrations, holidays as 'festival' type
12. Extract shopping areas, shopping districts as 'shopping_district' type
13. Extract hospitals, medical centers, clinics as 'hospital' type
14. Extract nightclubs, entertainment venues as 'club' type

CONFIDENCE SCORING:
- 0.9-1.0: Entity has detailed description, address, or multiple mentions
- 0.7-0.8: Entity clearly named with some context
- 0.5-0.6: Entity mentioned with minimal context
- 0.3-0.4: Entity briefly mentioned or implied
- Use LOW confidence (0.3-0.5) for brief mentions - we WANT these entities!

LOCAL NAME HANDLING:
- Look for names in local scripts or transliterations
- "Wat" = Thai temple, "Soi" = Thai street, "Khlong" = Thai canal
- "Souq/Souk" = Arabic market, "Hammam" = Arabic bath
- Capture both English and local names when available

Output valid JSON with ALL entities found. AIM FOR 30+ ENTITIES PER BATCH.`;

function buildQuickScanPrompt(text: string, entityTypes: EntityType[]): string {
  const typesList = `
ENTITY TYPES TO EXTRACT:
- hotel: Hotels, resorts, hostels, guesthouses, serviced apartments
- restaurant: Restaurants, eateries, dining establishments
- attraction: Tourist attractions, points of interest, things to do
- neighborhood: Districts, areas, streets, sois, quarters, zones
- beach: Beaches, coastal areas, beach clubs
- mall: Shopping malls, shopping centers
- museum: Museums, galleries, exhibition halls
- park: Parks, gardens, nature reserves
- landmark: Famous buildings, monuments, iconic structures
- transport: Transportation services, tour operators
- event: Regular events, shows, performances
- temple: Temples, shrines, mosques, churches, wat, religious sites
- bar: Bars, pubs, beer gardens, wine bars
- rooftop: Rooftop bars, sky bars, rooftop restaurants, rooftop lounges
- market: Markets, bazaars, night markets, floating markets, street markets
- spa: Spas, wellness centers, massage parlors, hammams
- cafe: Cafes, coffee shops, tea houses, bakeries
- club: Nightclubs, entertainment venues, dance clubs
- transit_hub: Airports, train stations, bus terminals, ferry terminals, BTS/MRT stations
- hospital: Hospitals, medical centers, clinics
- festival: Festivals, annual events, celebrations, holidays
- shopping_district: Shopping streets, shopping areas, shopping districts`;

  return `EXTRACT ALL TRAVEL ENTITIES from this text. Be AGGRESSIVE - capture everything!

${typesList}

TEXT TO ANALYZE:
${text.slice(0, 20000)}

INSTRUCTIONS:
1. Find EVERY entity mentioned - even brief mentions
2. Include local language names (Thai, Arabic, Japanese, etc.)
3. Street names and districts are neighborhoods
4. Use low confidence (0.3-0.5) for brief mentions - we still want them
5. AIM FOR 30+ ENTITIES

Respond with JSON:
{
  "entities": [
    {
      "name": "entity name (English)",
      "nameLocal": "local language name if available",
      "type": "one of the entity types listed above",
      "confidence": 0.3-1.0,
      "description": "brief description from text",
      "location": {
        "address": "if mentioned",
        "neighborhood": "district/area if mentioned",
        "city": "city name"
      },
      "rawMention": "exact text snippet where mentioned"
    }
  ]
}`;
}

function parseQuickScanResult(result: any, sectionIndex: number): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  if (!result.entities || !Array.isArray(result.entities)) {
    return entities;
  }

  for (const e of result.entities) {
    if (!e.name || !e.type) continue;

    // Validate entity type
    if (!ALL_ENTITY_TYPES.includes(e.type)) {
      e.type = 'attraction'; // Default fallback
    }

    const baseEntity: BaseEntity = {
      id: generateEntityId(e.name, e.type),
      type: e.type,
      name: e.name,
      nameLocal: e.nameLocal,
      description: e.description || '',
      confidence: e.confidence || 0.5,
      sourceSection: sectionIndex,
      rawMentions: e.rawMention ? [e.rawMention] : [],
      location: e.location,
    };

    entities.push(baseEntity as ExtractedEntity);
  }

  return entities;
}

// ============================================================================
// Sweep Scan - Final Pass to Catch Missed Entities
// ============================================================================

async function sweepScanForMissedEntities(
  document: ParsedDocument,
  existingEntities: ExtractedEntity[],
  options: ExtractionOptions,
  providers: ReturnType<typeof getAllUnifiedProviders>
): Promise<{ entities: ExtractedEntity[]; provider: string }> {
  const entities: ExtractedEntity[] = [];

  // Combine all document text for a final sweep
  const fullText = document.sections.map(s => s.content).join('\n\n');
  const existingNames = new Set(existingEntities.map(e => e.name.toLowerCase()));

  const prompt = buildSweepScanPrompt(fullText, existingNames, options.entityTypes || ALL_ENTITY_TYPES);

  try {
    // PHASE 14: Use safeAIRequest with explicit category for rejection handling
    const result = await safeAIRequest(
      [
        { role: 'system', content: SWEEP_SCAN_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0.2,
        maxTokens: 8000,
        responseFormat: { type: 'json_object' },
      },
      {
        operation: 'sweep_scan',
      }
    );

    const parsed = JSON.parse(result.content);
    const sweepEntities = parseQuickScanResult(parsed, 0);
    
    // Filter out entities we already have
    for (const entity of sweepEntities) {
      if (!existingNames.has(entity.name.toLowerCase())) {
        entities.push(entity);
      }
    }

    octopusLogger.info('Sweep scan completed via queue', {
      newEntitiesFound: entities.length,
      provider: result.provider,
    });

    return { entities, provider: result.provider };
  } catch (error: any) {
    // PHASE 14: Check if this is a rejection error
    const isRejection = error instanceof AITaskRejectionError;
    
    octopusLogger.error('Sweep scan failed', { 
      error: error.message,
      isRejection,
      category: EXTRACTION_CATEGORY,
    });
    
    // PHASE 14: If it's a rejection, throw to fail the job
    if (isRejection) {
      throw error;
    }
    return { entities, provider: 'unknown' };
  }
}

const SWEEP_SCAN_SYSTEM_PROMPT = `You are a METICULOUS entity extraction specialist doing a FINAL SWEEP.
Your job is to find travel entities that were MISSED in previous extraction passes.

Focus on finding:
1. Entities mentioned only once or in passing
2. Entities with unusual names or local language names
3. Small cafes, bars, street food stalls
4. Lesser-known temples, shrines, local markets
5. Transit stations, neighborhoods, districts
6. Events, festivals, local celebrations
7. Spas, wellness centers, hospitals
8. Rooftop venues, clubs, nightlife spots

Be EXHAUSTIVE. Even if an entity seems minor, include it with low confidence.
We want COMPLETE coverage of the destination.

Output valid JSON only.`;

function buildSweepScanPrompt(
  text: string,
  existingNames: Set<string>,
  entityTypes: EntityType[]
): string {
  const existingList = Array.from(existingNames).slice(0, 100).join(', ');

  return `FINAL SWEEP: Find travel entities we might have MISSED.

ALREADY EXTRACTED (DO NOT REPEAT):
${existingList}

LOOK FOR MISSED ENTITIES:
- Brief mentions of places
- Local language names (Wat, Soi, Khlong, Souq, etc.)
- Small venues (cafes, bars, street food stalls)
- Transit stations, neighborhoods
- Lesser-known attractions
- Events and festivals
- Medical facilities, spas
- Markets, shopping areas

ENTITY TYPES: ${entityTypes.join(', ')}

FULL DOCUMENT TEXT:
${text.slice(0, 25000)}

Find ALL entities NOT in the "already extracted" list. Use low confidence (0.3-0.5) for brief mentions.

Respond with JSON:
{
  "entities": [
    {
      "name": "entity name",
      "nameLocal": "local name if available", 
      "type": "entity type",
      "confidence": 0.3-1.0,
      "description": "brief description",
      "location": { "neighborhood": "area", "city": "city" },
      "rawMention": "text snippet"
    }
  ]
}`;
}

// ============================================================================
// Deep Analysis (Sonnet-equivalent)
// ============================================================================

async function deepEntityAnalysis(
  document: ParsedDocument,
  existingEntities: ExtractedEntity[],
  options: ExtractionOptions,
  providers: ReturnType<typeof getAllUnifiedProviders>
): Promise<{ entities: ExtractedEntity[]; provider: string }> {
  const enrichedEntities: ExtractedEntity[] = [];

  // Group entities by type for batch processing
  const entityGroups = groupEntitiesByType(existingEntities);
  let usedProvider = 'unknown';
  const totalGroups = Object.keys(entityGroups).filter(k => (entityGroups as Record<string, ExtractedEntity[]>)[k].length > 0).length;
  let groupIndex = 0;

  octopusLogger.info('Starting deep analysis with queue system', {
    totalGroups,
    queueStats: getQueueStats(),
  });

  for (const [type, entities] of Object.entries(entityGroups)) {
    if (entities.length === 0) continue;
    groupIndex++;

    // Find relevant sections for these entities
    const relevantText = findRelevantText(document, entities);
    if (!relevantText) continue;

    const prompt = buildDeepAnalysisPrompt(type as EntityType, entities, relevantText);

    try {
      // PHASE 14: Use safeAIRequest with explicit category for rejection handling
      const result = await safeAIRequest(
        [
          { role: 'system', content: DEEP_ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        {
          temperature: 0.2,
          maxTokens: 8000,
          responseFormat: { type: 'json_object' },
        },
        {
          operation: 'deep_entity_analysis',
          batchIndex: groupIndex,
          totalBatches: totalGroups,
        }
      );

      const parsed = JSON.parse(result.content);
      const enriched = parseDeepAnalysisResult(parsed, type as EntityType);
      enrichedEntities.push(...enriched);
      usedProvider = result.provider;

      octopusLogger.info('Entity group enriched via queue', {
        groupIndex,
        totalGroups,
        entityType: type,
        entitiesEnriched: enriched.length,
        provider: result.provider,
      });

    } catch (error: any) {
      // PHASE 14: Check if this is a rejection error
      const isRejection = error instanceof AITaskRejectionError;
      
      octopusLogger.error('Deep analysis failed for entity type', {
        entityType: type,
        error: error.message,
        isRejection,
        category: EXTRACTION_CATEGORY,
      });
      
      // PHASE 14: If it's a rejection, throw to fail the job
      if (isRejection) {
        throw error;
      }
      // Continue with other entity types for non-rejection errors
    }
  }

  return { entities: enrichedEntities, provider: usedProvider };
}

const DEEP_ANALYSIS_SYSTEM_PROMPT = `You are an expert travel content analyst.
Your task is to deeply analyze and enrich travel entity information.

For each entity, extract ALL available details based on the entity type:
- For hotels: star rating, amenities, room types, price range, target audience
- For restaurants: cuisine type, specialties, price range, dining style
- For attractions: category, duration, ticket prices, highlights, best time to visit
- For neighborhoods: characteristics, atmosphere, what it's known for
- For temples/religious sites: religion, architectural style, history, dress code
- For bars/clubs: music style, dress code, price range, peak hours
- For rooftops: view description, signature drinks, dress code
- For markets: type of goods, best times, bargaining tips
- For spas: treatment types, price range, specialties
- For cafes: specialty drinks, atmosphere, wifi availability
- For transit hubs: connections, services, tips
- For hospitals: specialties, international services, languages spoken
- For festivals: dates, activities, cultural significance
- For shopping districts: types of shops, price ranges, best for

Be thorough but accurate. Only include information that is explicitly stated or strongly implied.
Output valid JSON only.`;

function buildDeepAnalysisPrompt(
  type: EntityType,
  entities: ExtractedEntity[],
  relevantText: string
): string {
  const entityList = entities.map(e => `- ${e.name}: ${e.description}`).join('\n');

  return `Enrich these ${type} entities with detailed information:

ENTITIES:
${entityList}

RELEVANT TEXT:
${relevantText.slice(0, 15000)}

For ${type} entities, extract:
${getTypeSpecificFields(type)}

Respond with JSON:
{
  "entities": [
    {
      "name": "exact entity name",
      "enrichedData": {
        // type-specific fields
      },
      "confidence": 0.85
    }
  ]
}`;
}

function getTypeSpecificFields(type: EntityType): string {
  switch (type) {
    case 'hotel':
      return `- starRating (1-5)
- priceRange ($, $$, $$$, $$$$)
- amenities (array)
- roomTypes (array)
- targetAudience (families, couples, business, etc.)`;
    case 'restaurant':
      return `- cuisineType (array)
- priceRange ($, $$, $$$, $$$$)
- diningStyle (casual, fine dining, fast food, etc.)
- specialties (array)
- openingHours`;
    case 'temple':
      return `- religion (Buddhist, Hindu, Islamic, etc.)
- architecturalStyle
- historicalSignificance
- dressCode
- entryFee
- bestTimeToVisit`;
    case 'bar':
      return `- barType (cocktail bar, sports bar, wine bar, etc.)
- priceRange ($, $$, $$$, $$$$)
- musicStyle
- dressCode
- peakHours
- specialties (signature drinks)`;
    case 'rooftop':
      return `- viewDescription
- priceRange ($, $$, $$$, $$$$)
- signatureDrinks (array)
- dressCode
- bestTimeToVisit
- reservationRequired (boolean)`;
    case 'market':
      return `- marketType (night market, floating market, flea market, etc.)
- goodsSold (array)
- operatingHours
- bargainingTips
- bestTimeToVisit
- paymentMethods`;
    case 'spa':
      return `- treatmentTypes (array)
- priceRange ($, $$, $$$, $$$$)
- specialties (array)
- duration (typical treatment time)
- reservationRequired (boolean)`;
    case 'cafe':
      return `- cafeType (coffee shop, tea house, bakery, etc.)
- priceRange ($, $$, $$$)
- specialties (array)
- wifiAvailable (boolean)
- atmosphere
- openingHours`;
    case 'club':
      return `- clubType (nightclub, dance club, live music, etc.)
- musicGenre (array)
- priceRange ($, $$, $$$, $$$$)
- dressCode
- peakHours
- coverCharge`;
    case 'transit_hub':
      return `- hubType (airport, train station, bus terminal, etc.)
- connections (array of destinations/lines)
- services (array)
- operatingHours
- tips`;
    case 'hospital':
      return `- hospitalType (general, specialized, clinic)
- specialties (array)
- internationalServices (boolean)
- languagesSpoken (array)
- emergencyServices (boolean)`;
    case 'festival':
      return `- dates (when it occurs)
- duration
- activities (array)
- culturalSignificance
- location
- tips`;
    case 'shopping_district':
      return `- shopTypes (array)
- priceRange ($, $$, $$$, $$$$)
- bestFor (array)
- operatingHours
- atmosphere`;
    case 'attraction':
    case 'beach':
    case 'museum':
    case 'mall':
    case 'park':
    case 'landmark':
      return `- category
- duration (time needed)
- ticketPrice
- bestTimeToVisit
- highlights (array)`;
    case 'neighborhood':
      return `- characteristics (array)
- knownFor (array)
- atmosphere`;
    case 'transport':
    case 'event':
    default:
      return '- any relevant details';
  }
}

function parseDeepAnalysisResult(result: any, type: EntityType): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  if (!result.entities || !Array.isArray(result.entities)) {
    return entities;
  }

  for (const e of result.entities) {
    if (!e.name) continue;

    const enriched = e.enrichedData || {};

    switch (type) {
      case 'hotel':
        entities.push({
          id: generateEntityId(e.name, type),
          type: 'hotel',
          name: e.name,
          description: enriched.description || '',
          confidence: e.confidence || 0.8,
          sourceSection: 0,
          rawMentions: [],
          starRating: enriched.starRating,
          priceRange: enriched.priceRange,
          amenities: enriched.amenities,
          roomTypes: enriched.roomTypes,
          targetAudience: enriched.targetAudience,
        } as HotelEntity);
        break;
      case 'restaurant':
        entities.push({
          id: generateEntityId(e.name, type),
          type: 'restaurant',
          name: e.name,
          description: enriched.description || '',
          confidence: e.confidence || 0.8,
          sourceSection: 0,
          rawMentions: [],
          cuisineType: enriched.cuisineType,
          priceRange: enriched.priceRange,
          diningStyle: enriched.diningStyle,
          specialties: enriched.specialties,
          openingHours: enriched.openingHours,
        } as RestaurantEntity);
        break;
      case 'neighborhood':
        entities.push({
          id: generateEntityId(e.name, type),
          type: 'neighborhood',
          name: e.name,
          description: enriched.description || '',
          confidence: e.confidence || 0.8,
          sourceSection: 0,
          rawMentions: [],
          characteristics: enriched.characteristics,
          knownFor: enriched.knownFor,
          atmosphere: enriched.atmosphere,
        } as NeighborhoodEntity);
        break;
      case 'temple':
      case 'bar':
      case 'rooftop':
      case 'market':
      case 'spa':
      case 'cafe':
      case 'club':
      case 'transit_hub':
      case 'hospital':
      case 'festival':
      case 'shopping_district':
      case 'attraction':
      case 'beach':
      case 'museum':
      case 'mall':
      case 'park':
      case 'landmark':
      case 'transport':
      case 'event':
      default:
        entities.push({
          id: generateEntityId(e.name, type),
          type: type as any,
          name: e.name,
          description: enriched.description || '',
          confidence: e.confidence || 0.8,
          sourceSection: 0,
          rawMentions: [],
          category: enriched.category,
          duration: enriched.duration,
          ticketPrice: enriched.ticketPrice || enriched.entryFee || enriched.coverCharge,
          bestTimeToVisit: enriched.bestTimeToVisit,
          highlights: enriched.highlights || enriched.specialties || enriched.activities,
        } as AttractionEntity);
    }
  }

  return entities;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateDocumentId(doc: ParsedDocument): string {
  const hash = doc.filename.replace(/[^a-zA-Z0-9]/g, '') + doc.totalWords;
  return `doc_${hash.slice(0, 16)}`;
}

function generateEntityId(name: string, type: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  return `${type}_${slug}_${Date.now().toString(36)}`;
}

function detectDestination(
  document: ParsedDocument,
  entities: ExtractedEntity[]
): string | undefined {
  // Look for common destination patterns in document title or first section
  const titleAndIntro = (document.metadata.title || '') + ' ' +
    (document.sections[0]?.content.slice(0, 500) || '');

  // Check for city/country mentions
  const destinations = [
    'Dubai', 'Abu Dhabi', 'Sharjah', 'Tel Aviv', 'Jerusalem', 'Eilat',
    'Paris', 'London', 'New York', 'Tokyo', 'Singapore', 'Bangkok',
    'Rome', 'Barcelona', 'Amsterdam', 'Istanbul', 'Cairo', 'Marrakech',
    'Bali', 'Phuket', 'Hong Kong', 'Seoul', 'Kyoto', 'Osaka',
    'Las Vegas', 'Miami', 'Los Angeles', 'San Francisco', 'Sydney',
    'Melbourne', 'Auckland', 'Queenstown', 'Kuala Lumpur', 'Jakarta',
    'Ho Chi Minh', 'Hanoi', 'Chiang Mai', 'Krabi', 'Pattaya',
  ];

  for (const dest of destinations) {
    if (titleAndIntro.toLowerCase().includes(dest.toLowerCase())) {
      return dest;
    }
  }

  // Check entity locations
  for (const entity of entities) {
    if (entity.location?.city) {
      return entity.location.city;
    }
  }

  return undefined;
}

function groupEntitiesByType(
  entities: ExtractedEntity[]
): Record<string, ExtractedEntity[]> {
  const groups: Record<string, ExtractedEntity[]> = {};

  for (const entity of entities) {
    if (!groups[entity.type]) {
      groups[entity.type] = [];
    }
    groups[entity.type].push(entity);
  }

  return groups;
}

function findRelevantText(
  document: ParsedDocument,
  entities: ExtractedEntity[]
): string {
  const entityNames = new Set(entities.map(e => e.name.toLowerCase()));
  const relevantSections: string[] = [];

  for (const section of document.sections) {
    const sectionLower = section.content.toLowerCase();
    for (const name of entityNames) {
      if (sectionLower.includes(name)) {
        relevantSections.push(section.content);
        break;
      }
    }
  }

  return relevantSections.join('\n\n---\n\n');
}

function mergeEntities(
  existing: ExtractedEntity[],
  newEntities: ExtractedEntity[]
): void {
  const existingMap = new Map(existing.map(e => [e.name.toLowerCase(), e]));

  for (const newEntity of newEntities) {
    const key = newEntity.name.toLowerCase();
    const existingEntity = existingMap.get(key);

    if (existingEntity) {
      // Merge enriched data into existing entity
      Object.assign(existingEntity, {
        ...newEntity,
        confidence: Math.max(existingEntity.confidence, newEntity.confidence),
        rawMentions: [
          ...existingEntity.rawMentions,
          ...newEntity.rawMentions,
        ],
      });
    } else {
      existing.push(newEntity);
      existingMap.set(key, newEntity);
    }
  }
}

/**
 * Get extraction stats for monitoring
 */
export function getExtractionStats(result: ExtractionResult): {
  totalEntities: number;
  byType: Record<string, number>;
  avgConfidence: number;
  topEntities: { name: string; type: string; confidence: number }[];
  destination: string | undefined;
} {
  return {
    totalEntities: result.summary.totalEntities,
    byType: result.summary.byType as Record<string, number>,
    avgConfidence: result.summary.averageConfidence,
    topEntities: result.entities
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
      .map(e => ({ name: e.name, type: e.type, confidence: e.confidence })),
    destination: result.destination,
  };
}
