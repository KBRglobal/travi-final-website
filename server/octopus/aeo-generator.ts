/**
 * Octopus Engine - AEO (Answer Engine Optimization) Generator
 * Generates content optimized for voice search, featured snippets, and answer boxes
 */

import type { ExtractedEntity, HotelEntity, RestaurantEntity, AttractionEntity, NeighborhoodEntity } from './entity-extractor';
import { log } from '../lib/logger';

const aeoLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[AEO Generator] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[AEO Generator] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[AEO Generator] ${msg}`, data),
};

// ============================================================================
// Interfaces
// ============================================================================

export interface AEOContent {
  quickAnswer: QuickAnswerCapsule;
  featuredSnippet: FeaturedSnippetContent;
  faqs: FAQ[];
  schema: SchemaMarkup;
  voiceSearchOptimized: boolean;
}

export interface QuickAnswerCapsule {
  question: string;
  answer: string;
  confidence: number;
}

export interface FeaturedSnippetContent {
  paragraphSnippet: string;
  listSnippet: string[];
  tableSnippet?: { headers: string[]; rows: string[][] };
}

export interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export interface SchemaMarkup {
  type: 'Article' | 'FAQPage' | 'TouristAttraction' | 'Hotel' | 'Restaurant';
  data: Record<string, unknown>;
}

// ============================================================================
// FAQ Templates by Entity Type
// ============================================================================

const FAQ_TEMPLATES = {
  hotel: [
    { template: 'What is {name} known for?', category: 'Overview' },
    { template: 'How far is {name} from {landmark}?', category: 'Location' },
    { template: 'Does {name} have a pool?', category: 'Amenities' },
    { template: 'Does {name} have a spa?', category: 'Amenities' },
    { template: 'Does {name} have a restaurant?', category: 'Dining' },
    { template: 'What is check-in time at {name}?', category: 'Policies' },
    { template: 'What is check-out time at {name}?', category: 'Policies' },
    { template: 'Is {name} good for families?', category: 'Suitability' },
    { template: 'Is {name} good for couples?', category: 'Suitability' },
    { template: 'What room types are available at {name}?', category: 'Rooms' },
    { template: 'Does {name} offer airport transfers?', category: 'Services' },
    { template: 'Is there free WiFi at {name}?', category: 'Amenities' },
    { template: 'What is the price range at {name}?', category: 'Pricing' },
    { template: 'Does {name} have beach access?', category: 'Location' },
    { template: 'Are pets allowed at {name}?', category: 'Policies' },
  ],
  restaurant: [
    { template: 'What cuisine does {name} serve?', category: 'Cuisine' },
    { template: 'Does {name} require reservations?', category: 'Reservations' },
    { template: 'What is the dress code at {name}?', category: 'Dress Code' },
    { template: 'Is {name} halal?', category: 'Dietary' },
    { template: 'Is {name} vegetarian-friendly?', category: 'Dietary' },
    { template: 'Does {name} have vegan options?', category: 'Dietary' },
    { template: 'What are the opening hours of {name}?', category: 'Hours' },
    { template: 'Does {name} have outdoor seating?', category: 'Ambiance' },
    { template: 'Is {name} good for special occasions?', category: 'Occasions' },
    { template: 'What is {name} famous for?', category: 'Specialties' },
    { template: 'Does {name} have a kids menu?', category: 'Family' },
    { template: 'What is the average price at {name}?', category: 'Pricing' },
    { template: 'Does {name} serve alcohol?', category: 'Beverages' },
    { template: 'Is {name} open for lunch?', category: 'Hours' },
    { template: 'Does {name} offer delivery?', category: 'Services' },
  ],
  attraction: [
    { template: 'How long does {name} take to visit?', category: 'Duration' },
    { template: 'What is the best time to visit {name}?', category: 'Timing' },
    { template: 'How much are tickets for {name}?', category: 'Tickets' },
    { template: 'Is {name} suitable for children?', category: 'Family' },
    { template: 'What are the opening hours of {name}?', category: 'Hours' },
    { template: 'Is there parking at {name}?', category: 'Access' },
    { template: 'How do I get to {name}?', category: 'Access' },
    { template: 'Is {name} wheelchair accessible?', category: 'Accessibility' },
    { template: 'Can I take photos at {name}?', category: 'Rules' },
    { template: 'What should I wear to {name}?', category: 'Tips' },
    { template: 'Are there guided tours at {name}?', category: 'Tours' },
    { template: 'Is {name} free to visit?', category: 'Tickets' },
    { template: 'What is {name} famous for?', category: 'Overview' },
    { template: 'Is {name} crowded?', category: 'Timing' },
    { template: 'Are there restaurants near {name}?', category: 'Nearby' },
  ],
  neighborhood: [
    { template: 'What is {name} known for?', category: 'Overview' },
    { template: 'Is {name} safe to visit?', category: 'Safety' },
    { template: 'What are the best restaurants in {name}?', category: 'Dining' },
    { template: 'What are the main attractions in {name}?', category: 'Attractions' },
    { template: 'How do I get to {name}?', category: 'Access' },
    { template: 'Is {name} walkable?', category: 'Getting Around' },
    { template: 'What is the vibe of {name}?', category: 'Atmosphere' },
    { template: 'Are there hotels in {name}?', category: 'Accommodation' },
    { template: 'Is {name} good for nightlife?', category: 'Nightlife' },
    { template: 'What shops are in {name}?', category: 'Shopping' },
  ],
};

const LANDMARK_EXAMPLES = [
  'the airport',
  'downtown',
  'the beach',
  'the city center',
  'major attractions',
  'public transportation',
];

// ============================================================================
// Main AEO Content Generator
// ============================================================================

export async function generateAEOContent(
  entity: ExtractedEntity,
  contentType: string
): Promise<AEOContent> {
  const startTime = Date.now();

  aeoLogger.info('Generating AEO content', {
    entityName: entity.name,
    entityType: entity.type,
    contentType,
  });

  try {
    const entityContext = buildEntityContext(entity);
    const primaryQuestion = `What is ${entity.name}?`;
    
    const quickAnswer = generateQuickAnswer(primaryQuestion, entityContext);
    const faqs = generateFAQs(entity, 8);
    const featuredSnippet = generateFeaturedSnippet(entityContext);
    const schema = generateSchemaMarkup(entity, contentType);
    const voiceSearchOptimized = quickAnswer.answer.length >= 40 && quickAnswer.answer.length <= 80;

    const result: AEOContent = {
      quickAnswer,
      featuredSnippet,
      faqs,
      schema,
      voiceSearchOptimized,
    };

    aeoLogger.info('AEO content generated', {
      entityName: entity.name,
      faqCount: faqs.length,
      processingTime: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    aeoLogger.error('Failed to generate AEO content', {
      entityName: entity.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// Quick Answer Generator (40-60 words, direct answer)
// ============================================================================

export function generateQuickAnswer(question: string, context: string): QuickAnswerCapsule {
  const sentences = context.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const relevantSentences = sentences.slice(0, 3);
  
  let answer = relevantSentences.join('. ').trim();
  const words = answer.split(/\s+/);
  
  if (words.length > 60) {
    answer = words.slice(0, 55).join(' ') + '...';
  } else if (words.length < 40 && sentences.length > 3) {
    const additionalSentences = sentences.slice(3, 5);
    answer = [...relevantSentences, ...additionalSentences].join('. ').trim();
    const newWords = answer.split(/\s+/);
    if (newWords.length > 60) {
      answer = newWords.slice(0, 55).join(' ') + '...';
    }
  }

  if (!answer.endsWith('.') && !answer.endsWith('...')) {
    answer += '.';
  }

  const wordCount = answer.split(/\s+/).length;
  const confidence = wordCount >= 40 && wordCount <= 60 ? 0.9 : wordCount >= 30 ? 0.7 : 0.5;

  return {
    question,
    answer,
    confidence,
  };
}

// ============================================================================
// FAQ Generator (5-10 FAQs based on entity type)
// ============================================================================

export function generateFAQs(entity: ExtractedEntity, count: number = 8): FAQ[] {
  const faqs: FAQ[] = [];
  const entityType = mapEntityTypeToFAQCategory(entity.type);
  const templates = FAQ_TEMPLATES[entityType] || FAQ_TEMPLATES.attraction;
  
  const selectedTemplates = templates.slice(0, Math.min(count, templates.length));
  
  for (const templateData of selectedTemplates) {
    let question = templateData.template.replace(/{name}/g, entity.name);
    
    if (question.includes('{landmark}')) {
      const landmark = LANDMARK_EXAMPLES[Math.floor(Math.random() * LANDMARK_EXAMPLES.length)];
      question = question.replace(/{landmark}/g, landmark);
    }
    
    const answer = generateFAQAnswer(entity, question, templateData.category);
    
    faqs.push({
      question,
      answer,
      category: templateData.category,
    });
  }

  return faqs;
}

function mapEntityTypeToFAQCategory(type: string): keyof typeof FAQ_TEMPLATES {
  switch (type) {
    case 'hotel':
      return 'hotel';
    case 'restaurant':
    case 'cafe':
    case 'bar':
    case 'rooftop':
      return 'restaurant';
    case 'neighborhood':
      return 'neighborhood';
    default:
      return 'attraction';
  }
}

function generateFAQAnswer(entity: ExtractedEntity, question: string, category: string): string {
  const name = entity.name;
  const description = entity.description || '';
  
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('known for') || lowerQuestion.includes('famous for')) {
    if (description) {
      return `${name} is renowned for ${description.toLowerCase().replace(/^the\s+/i, '')}. It offers visitors a memorable experience with its unique features and excellent service.`;
    }
    return `${name} is a popular destination known for its exceptional quality and service. Visitors appreciate its unique atmosphere and offerings.`;
  }
  
  if (lowerQuestion.includes('how far') || lowerQuestion.includes('distance')) {
    const location = entity.location?.neighborhood || entity.location?.city || 'the area';
    return `${name} is conveniently located in ${location}. The distance to major landmarks varies, but it's easily accessible by taxi, metro, or ride-sharing services.`;
  }
  
  if (lowerQuestion.includes('check-in') || lowerQuestion.includes('check-out')) {
    return `Standard check-in at ${name} is typically at 3:00 PM, and check-out is at 12:00 PM. Early check-in or late check-out may be available upon request, subject to availability.`;
  }
  
  if (lowerQuestion.includes('pool') || lowerQuestion.includes('spa') || lowerQuestion.includes('amenities')) {
    return `${name} offers a range of amenities for guests. Please contact them directly or check their official website for the most up-to-date information on available facilities.`;
  }
  
  if (lowerQuestion.includes('reservation') || lowerQuestion.includes('book')) {
    return `Reservations at ${name} are recommended, especially during peak hours and weekends. You can book through their official website, by phone, or through popular booking platforms.`;
  }
  
  if (lowerQuestion.includes('dress code')) {
    return `${name} typically maintains a smart casual dress code. For special dining areas or evening visits, slightly more formal attire may be appreciated.`;
  }
  
  if (lowerQuestion.includes('halal') || lowerQuestion.includes('vegetarian') || lowerQuestion.includes('vegan')) {
    return `${name} caters to various dietary requirements. Please contact them directly to confirm specific dietary options and ensure they can accommodate your needs.`;
  }
  
  if (lowerQuestion.includes('opening hours') || lowerQuestion.includes('hours')) {
    return `${name} operates during standard business hours. For the most accurate opening times, including holiday schedules, please check their official website or contact them directly.`;
  }
  
  if (lowerQuestion.includes('how long') || lowerQuestion.includes('duration')) {
    return `A typical visit to ${name} takes approximately 1-2 hours, though this can vary depending on your interests and the activities you choose to engage in.`;
  }
  
  if (lowerQuestion.includes('best time')) {
    return `The best time to visit ${name} is during weekday mornings when it's less crowded. For specific seasonal recommendations, consider the local weather and any special events.`;
  }
  
  if (lowerQuestion.includes('tickets') || lowerQuestion.includes('price') || lowerQuestion.includes('cost')) {
    return `Ticket prices for ${name} vary based on age and type of access. Check their official website for current pricing, available packages, and any special promotions.`;
  }
  
  if (lowerQuestion.includes('children') || lowerQuestion.includes('family') || lowerQuestion.includes('kids')) {
    return `${name} welcomes families and is generally suitable for visitors of all ages. Some activities may have age restrictions, so please check in advance for specific requirements.`;
  }
  
  if (lowerQuestion.includes('cuisine') || lowerQuestion.includes('food') || lowerQuestion.includes('serve')) {
    return `${name} serves a carefully curated menu featuring high-quality dishes. Their culinary offerings cater to diverse tastes while maintaining consistent quality.`;
  }
  
  if (lowerQuestion.includes('parking') || lowerQuestion.includes('access') || lowerQuestion.includes('get to')) {
    const location = entity.location?.address || entity.location?.neighborhood || '';
    return `${name}${location ? ` is located at ${location}` : ' is easily accessible'}. Parking and transportation options are available nearby. Public transit is also a convenient option.`;
  }
  
  return `${name} offers visitors an excellent experience. For detailed information about specific features and services, please visit their official website or contact them directly.`;
}

// ============================================================================
// Featured Snippet Generator
// ============================================================================

export function generateFeaturedSnippet(content: string): FeaturedSnippetContent {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  const paragraphWords = sentences.slice(0, 3).join('. ').split(/\s+/);
  let paragraphSnippet = paragraphWords.slice(0, 45).join(' ');
  if (!paragraphSnippet.endsWith('.')) {
    paragraphSnippet += '.';
  }
  
  const listItems: string[] = [];
  const keyPhrases = extractKeyPhrases(content);
  for (const phrase of keyPhrases.slice(0, 8)) {
    if (phrase.length > 5 && phrase.length < 100) {
      listItems.push(capitalizeFirst(phrase));
    }
  }
  
  if (listItems.length < 3) {
    const defaults = ['Quality service and amenities', 'Convenient location', 'Excellent visitor experience'];
    listItems.push(...defaults.slice(0, 3 - listItems.length));
  }

  return {
    paragraphSnippet,
    listSnippet: listItems.slice(0, 8),
  };
}

function extractKeyPhrases(content: string): string[] {
  const phrases: string[] = [];
  
  const bulletPoints = content.match(/[•\-\*]\s*([^•\-\*\n]+)/g);
  if (bulletPoints) {
    for (const bp of bulletPoints) {
      const cleaned = bp.replace(/^[•\-\*]\s*/, '').trim();
      if (cleaned.length > 5) {
        phrases.push(cleaned);
      }
    }
  }
  
  const keywords = ['offers', 'features', 'includes', 'provides', 'known for', 'famous for'];
  const sentences = content.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    for (const keyword of keywords) {
      if (sentence.toLowerCase().includes(keyword)) {
        const parts = sentence.split(new RegExp(keyword, 'i'));
        if (parts[1]) {
          const phrase = parts[1].trim().replace(/^[,:\s]+/, '');
          if (phrase.length > 5 && phrase.length < 100) {
            phrases.push(phrase);
          }
        }
      }
    }
  }
  
  return Array.from(new Set(phrases));
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Schema.org Markup Generator (JSON-LD)
// ============================================================================

export function generateSchemaMarkup(entity: ExtractedEntity, contentType: string): SchemaMarkup {
  const schemaType = mapContentTypeToSchema(entity.type, contentType);
  
  const baseData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: entity.name,
    description: entity.description,
  };
  
  if (entity.location) {
    baseData.address = {
      '@type': 'PostalAddress',
      streetAddress: entity.location.address,
      addressLocality: entity.location.city,
      addressCountry: entity.location.country,
    };
    
    if (entity.location.coordinates) {
      baseData.geo = {
        '@type': 'GeoCoordinates',
        latitude: entity.location.coordinates.lat,
        longitude: entity.location.coordinates.lng,
      };
    }
  }
  
  switch (entity.type) {
    case 'hotel':
      return generateHotelSchema(entity as HotelEntity, baseData);
    case 'restaurant':
    case 'cafe':
    case 'bar':
    case 'rooftop':
      return generateRestaurantSchema(entity as RestaurantEntity, baseData);
    case 'attraction':
    case 'museum':
    case 'park':
    case 'landmark':
    case 'beach':
    case 'temple':
    case 'mall':
      return generateAttractionSchema(entity as AttractionEntity, baseData);
    default:
      return {
        type: 'Article',
        data: {
          ...baseData,
          '@type': 'Article',
          headline: entity.name,
          articleBody: entity.description,
        },
      };
  }
}

function mapContentTypeToSchema(entityType: string, contentType: string): string {
  if (contentType === 'faq') return 'FAQPage';
  if (contentType === 'article') return 'Article';
  
  switch (entityType) {
    case 'hotel':
      return 'Hotel';
    case 'restaurant':
    case 'cafe':
    case 'bar':
    case 'rooftop':
      return 'Restaurant';
    case 'attraction':
    case 'museum':
    case 'park':
    case 'landmark':
    case 'beach':
    case 'temple':
    case 'mall':
      return 'TouristAttraction';
    default:
      return 'Article';
  }
}

function generateHotelSchema(entity: HotelEntity, baseData: Record<string, unknown>): SchemaMarkup {
  const hotelData: Record<string, unknown> = {
    ...baseData,
    '@type': 'Hotel',
  };
  
  if (entity.starRating) {
    hotelData.starRating = {
      '@type': 'Rating',
      ratingValue: entity.starRating,
    };
  }
  
  if (entity.priceRange) {
    hotelData.priceRange = entity.priceRange;
  }
  
  if (entity.amenities && entity.amenities.length > 0) {
    hotelData.amenityFeature = entity.amenities.map(amenity => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity,
    }));
  }
  
  if (entity.roomTypes && entity.roomTypes.length > 0) {
    hotelData.containsPlace = entity.roomTypes.map(room => ({
      '@type': 'HotelRoom',
      name: room,
    }));
  }
  
  return {
    type: 'Hotel',
    data: hotelData,
  };
}

function generateRestaurantSchema(entity: RestaurantEntity, baseData: Record<string, unknown>): SchemaMarkup {
  const restaurantData: Record<string, unknown> = {
    ...baseData,
    '@type': 'Restaurant',
  };
  
  if (entity.cuisineType && entity.cuisineType.length > 0) {
    restaurantData.servesCuisine = entity.cuisineType;
  }
  
  if (entity.priceRange) {
    restaurantData.priceRange = entity.priceRange;
  }
  
  if (entity.openingHours) {
    restaurantData.openingHours = entity.openingHours;
  }
  
  if (entity.diningStyle) {
    restaurantData.additionalType = entity.diningStyle;
  }
  
  if (entity.specialties && entity.specialties.length > 0) {
    restaurantData.hasMenu = {
      '@type': 'Menu',
      hasMenuSection: {
        '@type': 'MenuSection',
        name: 'Specialties',
        hasMenuItem: entity.specialties.map(item => ({
          '@type': 'MenuItem',
          name: item,
        })),
      },
    };
  }
  
  return {
    type: 'Restaurant',
    data: restaurantData,
  };
}

function generateAttractionSchema(entity: AttractionEntity, baseData: Record<string, unknown>): SchemaMarkup {
  const attractionData: Record<string, unknown> = {
    ...baseData,
    '@type': 'TouristAttraction',
  };
  
  if (entity.category) {
    attractionData.touristType = entity.category;
  }
  
  if (entity.duration) {
    attractionData.tourBookingPage = entity.duration;
  }
  
  if (entity.ticketPrice) {
    attractionData.offers = {
      '@type': 'Offer',
      price: entity.ticketPrice,
      priceCurrency: 'AED',
    };
  }
  
  if (entity.highlights && entity.highlights.length > 0) {
    attractionData.amenityFeature = entity.highlights.map(highlight => ({
      '@type': 'LocationFeatureSpecification',
      name: highlight,
    }));
  }
  
  if (entity.bestTimeToVisit) {
    attractionData.openingHoursSpecification = {
      '@type': 'OpeningHoursSpecification',
      description: entity.bestTimeToVisit,
    };
  }
  
  return {
    type: 'TouristAttraction',
    data: attractionData,
  };
}

// ============================================================================
// Voice Search Optimization
// ============================================================================

export function optimizeForVoiceSearch(content: string): string {
  let optimized = content;
  
  const sentences = optimized.split(/(?<=[.!?])\s+/);
  const conversationalSentences: string[] = [];
  
  for (const sentence of sentences) {
    let converted = sentence;
    
    converted = converted.replace(/It is worth noting that/gi, 'You should know that');
    converted = converted.replace(/One should/gi, 'You should');
    converted = converted.replace(/Visitors can/gi, 'You can');
    converted = converted.replace(/Guests may/gi, 'You may');
    converted = converted.replace(/It is recommended/gi, 'We recommend');
    converted = converted.replace(/It is advisable/gi, 'We advise');
    converted = converted.replace(/The establishment offers/gi, 'They offer');
    converted = converted.replace(/The venue provides/gi, 'They provide');
    converted = converted.replace(/This location features/gi, 'This place has');
    
    conversationalSentences.push(converted);
  }
  
  optimized = conversationalSentences.join(' ');
  
  const addQuestionContext = (text: string): string => {
    const segments = text.split(/(?<=[.!?])\s+/);
    const enhanced: string[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      if (i === 0 && !segment.includes('?') && segment.length < 100) {
        if (segment.toLowerCase().includes('located') || segment.toLowerCase().includes('address')) {
          enhanced.push(`Where is it? ${segment}`);
        } else if (segment.toLowerCase().includes('hour') || segment.toLowerCase().includes('time')) {
          enhanced.push(`When can you visit? ${segment}`);
        } else if (segment.toLowerCase().includes('cost') || segment.toLowerCase().includes('price')) {
          enhanced.push(`How much does it cost? ${segment}`);
        } else {
          enhanced.push(segment);
        }
      } else {
        enhanced.push(segment);
      }
    }
    
    return enhanced.join(' ');
  };
  
  optimized = addQuestionContext(optimized);
  
  optimized = optimized
    .replace(/approximately/gi, 'about')
    .replace(/additionally/gi, 'also')
    .replace(/subsequently/gi, 'then')
    .replace(/consequently/gi, 'so')
    .replace(/nevertheless/gi, 'but')
    .replace(/furthermore/gi, 'plus')
    .replace(/utilize/gi, 'use')
    .replace(/commence/gi, 'start')
    .replace(/terminate/gi, 'end')
    .replace(/facilitate/gi, 'help')
    .replace(/endeavor/gi, 'try')
    .replace(/ascertain/gi, 'find out');
  
  return optimized.trim();
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildEntityContext(entity: ExtractedEntity): string {
  const parts: string[] = [];
  
  parts.push(`${entity.name} is a ${entity.type.replace('_', ' ')} in ${entity.location?.city || 'the area'}.`);
  
  if (entity.description) {
    parts.push(entity.description);
  }
  
  if (entity.location?.neighborhood) {
    parts.push(`It is located in the ${entity.location.neighborhood} area.`);
  }
  
  switch (entity.type) {
    case 'hotel': {
      const hotel = entity as HotelEntity;
      if (hotel.starRating) {
        parts.push(`This is a ${hotel.starRating}-star property.`);
      }
      if (hotel.amenities?.length) {
        parts.push(`Amenities include ${hotel.amenities.slice(0, 5).join(', ')}.`);
      }
      if (hotel.targetAudience?.length) {
        parts.push(`Ideal for ${hotel.targetAudience.join(' and ')}.`);
      }
      break;
    }
    case 'restaurant':
    case 'cafe':
    case 'bar':
    case 'rooftop': {
      const restaurant = entity as RestaurantEntity;
      if (restaurant.cuisineType?.length) {
        parts.push(`Serves ${restaurant.cuisineType.join(', ')} cuisine.`);
      }
      if (restaurant.specialties?.length) {
        parts.push(`Known for ${restaurant.specialties.slice(0, 3).join(', ')}.`);
      }
      if (restaurant.priceRange) {
        parts.push(`Price range: ${restaurant.priceRange}.`);
      }
      break;
    }
    default: {
      const attraction = entity as AttractionEntity;
      if (attraction.highlights?.length) {
        parts.push(`Highlights include ${attraction.highlights.slice(0, 4).join(', ')}.`);
      }
      if (attraction.duration) {
        parts.push(`Typical visit duration: ${attraction.duration}.`);
      }
      if (attraction.bestTimeToVisit) {
        parts.push(`Best time to visit: ${attraction.bestTimeToVisit}.`);
      }
      break;
    }
  }
  
  return parts.join(' ');
}

// ============================================================================
// Generate FAQ Schema for a list of FAQs
// ============================================================================

export function generateFAQSchema(faqs: FAQ[]): SchemaMarkup {
  return {
    type: 'FAQPage',
    data: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
  };
}

// ============================================================================
// Generate Article Schema
// ============================================================================

export function generateArticleSchema(
  title: string,
  description: string,
  author: string,
  datePublished: string,
  imageUrl?: string
): SchemaMarkup {
  const articleData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Person',
      name: author,
    },
    datePublished,
    dateModified: new Date().toISOString(),
  };
  
  if (imageUrl) {
    articleData.image = imageUrl;
  }
  
  return {
    type: 'Article',
    data: articleData,
  };
}

// ============================================================================
// Batch AEO Generation
// ============================================================================

export async function generateBatchAEOContent(
  entities: ExtractedEntity[],
  contentType: string
): Promise<Map<string, AEOContent>> {
  const results = new Map<string, AEOContent>();
  
  aeoLogger.info('Starting batch AEO generation', {
    entityCount: entities.length,
    contentType,
  });
  
  for (const entity of entities) {
    try {
      const aeoContent = await generateAEOContent(entity, contentType);
      results.set(entity.id, aeoContent);
    } catch (error) {
      aeoLogger.error('Failed to generate AEO for entity', {
        entityId: entity.id,
        entityName: entity.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  aeoLogger.info('Batch AEO generation complete', {
    totalProcessed: entities.length,
    successCount: results.size,
  });
  
  return results;
}
