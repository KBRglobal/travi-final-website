/**
 * Octopus Engine - Research Document Parser
 * Parses structured Hebrew research documents from TRAVI research prompts
 * Extracts all entities and metadata for maximum content generation
 */

import { log } from '../lib/logger';
import type { ParsedDocument, DocumentSection } from './document-parser';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Research Parser] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Research Parser] ${msg}`, undefined, data),
};

// ============================================================================
// Types
// ============================================================================

export interface ParsedResearch {
  destination: string;
  country: string;
  language: 'he' | 'en' | 'ar';

  overview: DestinationOverview;
  hotels: HotelData[];
  attractions: AttractionData[];
  restaurants: RestaurantData[];
  freeActivities: FreeActivityData[];
  localLaws: LocalLawData[];
  practicalInfo: PracticalInfo;
  neighborhoods: NeighborhoodData[];

  metadata: {
    totalEntities: number;
    parseTime: number;
    sections: string[];
    completeness: number; // 0-100
  };
}

export interface DestinationOverview {
  description: string;
  vibe: string;
  targetAudiences: string[];
  bestSeasons: string[];
  competitiveAdvantages: string[];
}

export interface HotelData {
  name: string;
  nameEnglish?: string;
  stars: number;
  area: string;
  type: 'business' | 'luxury' | 'boutique' | 'resort' | 'family' | 'budget';
  targetAudience: string[];
  mainAdvantage: string;
  priceRange?: string;
  amenities?: string[];
}

export interface AttractionData {
  name: string;
  nameEnglish?: string;
  category: 'iconic' | 'culture' | 'nature' | 'shopping' | 'nightlife' | 'family' | 'unique';
  description: string;
  duration: string;
  targetAudience: string[];
  isFree: boolean;
  price?: string;
  area?: string;
  bestTime?: string;
}

export interface RestaurantData {
  name: string;
  nameEnglish?: string;
  category: 'fine_dining' | 'local' | 'international' | 'casual' | 'kosher' | 'cafe';
  cuisine: string;
  priceRange: string;
  area: string;
  whyGood: string;
  specialties?: string[];
}

export interface FreeActivityData {
  name: string;
  type: 'site' | 'neighborhood' | 'park' | 'viewpoint' | 'event' | 'experience';
  description: string;
  area?: string;
  bestTime?: string;
}

export interface LocalLawData {
  category: 'dress' | 'alcohol' | 'photography' | 'behavior' | 'safety' | 'cultural';
  rule: string;
  penalty?: string;
  importance: 'critical' | 'important' | 'recommended';
}

export interface PracticalInfo {
  recommendedAreas: { name: string; forWhom: string; why: string }[];
  avoidAreas?: { name: string; reason: string }[];
  transportation: string[];
  currency?: string;
  language?: string;
  timezone?: string;
  electricity?: string;
  tips: string[];
}

export interface NeighborhoodData {
  name: string;
  nameEnglish?: string;
  description: string;
  forWhom: string[];
  highlights: string[];
  hotelCount?: number;
  restaurantCount?: number;
}

// ============================================================================
// Section Patterns (Hebrew)
// ============================================================================

const SECTION_PATTERNS = {
  overview: /(?:סקירה כללית|תיאור כללי|מבוא)/i,
  hotels: /(?:מלונות|בתי מלון|לינה)/i,
  attractions: /(?:אטרקציות|פעילויות|מקומות לבקר)/i,
  restaurants: /(?:מסעדות|אוכל|דיינינג)/i,
  freeActivities: /(?:חינם|בחינם|ללא תשלום|free)/i,
  localLaws: /(?:חוקים|דגשים|אזהרות|טיפים)/i,
  practicalInfo: /(?:מידע שימושי|מידע פרקטי|טיפים)/i,
};

const HOTEL_TYPE_PATTERNS: Record<string, HotelData['type']> = {
  'עסקים': 'business',
  'עסקי': 'business',
  'יוקרה': 'luxury',
  'יוקרתי': 'luxury',
  'בוטיק': 'boutique',
  'ריזורט': 'resort',
  'נופש': 'resort',
  'משפחות': 'family',
  'משפחתי': 'family',
  'תקציבי': 'budget',
  'זול': 'budget',
};

const ATTRACTION_CATEGORY_PATTERNS: Record<string, AttractionData['category']> = {
  'אייקון': 'iconic',
  'חובה': 'iconic',
  'תרבות': 'culture',
  'היסטוריה': 'culture',
  'מוזיאון': 'culture',
  'טבע': 'nature',
  'חוץ': 'nature',
  'קניות': 'shopping',
  'שופינג': 'shopping',
  'לילה': 'nightlife',
  'מועדון': 'nightlife',
  'משפחה': 'family',
  'ילדים': 'family',
  'ייחודי': 'unique',
  'חוויה': 'unique',
};

const RESTAURANT_CATEGORY_PATTERNS: Record<string, RestaurantData['category']> = {
  'fine dining': 'fine_dining',
  'פיין דיינינג': 'fine_dining',
  'יוקרתי': 'fine_dining',
  'מקומי': 'local',
  'אותנטי': 'local',
  'בינלאומי': 'international',
  'קז\'ואל': 'casual',
  'קזואל': 'casual',
  'כשר': 'kosher',
  'קפה': 'cafe',
  'בית קפה': 'cafe',
};

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse a structured research document
 */
export function parseResearchDocument(document: ParsedDocument): ParsedResearch {
  const startTime = Date.now();

  // Detect language
  const language = detectLanguage(document.rawText);

  // Extract destination info from header
  const { destination, country } = extractDestinationInfo(document);

  // Split into sections
  const sections = splitIntoSections(document.rawText);

  // Parse each section
  const overview = parseOverviewSection(sections.overview || '');
  const hotels = parseHotelsSection(sections.hotels || '');
  const attractions = parseAttractionsSection(sections.attractions || '');
  const restaurants = parseRestaurantsSection(sections.restaurants || '');
  const freeActivities = parseFreeActivitiesSection(sections.freeActivities || '');
  const localLaws = parseLocalLawsSection(sections.localLaws || '');
  const practicalInfo = parsePracticalInfoSection(sections.practicalInfo || '');

  // Extract neighborhoods from various sections
  const neighborhoods = extractNeighborhoods(document.rawText, hotels, restaurants, attractions);

  const totalEntities = hotels.length + attractions.length + restaurants.length +
                        freeActivities.length + neighborhoods.length;

  // Calculate completeness
  const completeness = calculateCompleteness({
    overview, hotels, attractions, restaurants, freeActivities, localLaws, practicalInfo
  });

  const result: ParsedResearch = {
    destination,
    country,
    language,
    overview,
    hotels,
    attractions,
    restaurants,
    freeActivities,
    localLaws,
    practicalInfo,
    neighborhoods,
    metadata: {
      totalEntities,
      parseTime: Date.now() - startTime,
      sections: Object.keys(sections).filter(k => sections[k]),
      completeness,
    },
  };

  logger.info('Research document parsed', {
    destination,
    hotels: hotels.length,
    attractions: attractions.length,
    restaurants: restaurants.length,
    neighborhoods: neighborhoods.length,
    completeness,
  });

  return result;
}

// ============================================================================
// Section Parsers
// ============================================================================

function splitIntoSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};

  // Split by section headers (lines with dashes)
  const sectionBlocks = text.split(/\n-{10,}\n/);

  for (const block of sectionBlocks) {
    const lines = block.trim().split('\n');
    const header = lines[0] || '';
    const content = lines.slice(1).join('\n');

    // Match to section type
    for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(header)) {
        sections[sectionName] = content;
        break;
      }
    }
  }

  // Also try to find sections by numbered headers
  const numberedSections = text.match(/\d+\.\s+[^\n]+\n[\s\S]*?(?=\n\d+\.|$)/g) || [];
  for (const section of numberedSections) {
    const header = section.split('\n')[0];
    const content = section.split('\n').slice(1).join('\n');

    for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(header) && !sections[sectionName]) {
        sections[sectionName] = content;
        break;
      }
    }
  }

  return sections;
}

function parseOverviewSection(text: string): DestinationOverview {
  const lines = text.split('\n').filter(l => l.trim());

  return {
    description: extractValue(text, /תיאור|אופי|וייב/) || lines[0] || '',
    vibe: extractValue(text, /וייב|אופי|אווירה/) || '',
    targetAudiences: extractList(text, /קהל יעד|מתאים ל/),
    bestSeasons: extractList(text, /עונות|עונה|תקופה/),
    competitiveAdvantages: extractList(text, /יתרונות|יתרון/),
  };
}

function parseHotelsSection(text: string): HotelData[] {
  const hotels: HotelData[] = [];

  // Pattern for hotel entries
  const hotelPattern = /(?:^|\n)[-•*]?\s*(.+?)(?:\s*[-–]\s*|\n)(?:(\d)\s*כוכבים?)?/gm;

  // Split by bullet points or newlines
  const entries = text.split(/\n(?=[-•*]|\d+\.)/).filter(e => e.trim().length > 10);

  for (const entry of entries) {
    const hotel = parseHotelEntry(entry);
    if (hotel && hotel.name) {
      hotels.push(hotel);
    }
  }

  return hotels;
}

function parseHotelEntry(text: string): HotelData | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // First line usually has the name
  const nameLine = lines[0].replace(/^[-•*\d.]\s*/, '');
  const name = nameLine.split(/[-–:]/)[0].trim();

  if (!name || name.length < 2) return null;

  // Extract star rating
  const starsMatch = text.match(/(\d)\s*(?:כוכבים?|stars?|\*)/i);
  const stars = starsMatch ? parseInt(starsMatch[1]) : 4;

  // Extract type
  let type: HotelData['type'] = 'luxury';
  for (const [pattern, hotelType] of Object.entries(HOTEL_TYPE_PATTERNS)) {
    if (text.includes(pattern)) {
      type = hotelType;
      break;
    }
  }

  // Extract area
  const areaMatch = text.match(/(?:אזור|באזור|ב[-–])\s*([^,\n]+)/);
  const area = areaMatch ? areaMatch[1].trim() : '';

  // Extract target audience
  const targetAudience = extractList(text, /מתאים|למי|קהל/);

  // Extract main advantage
  const advantageMatch = text.match(/(?:יתרון|מיוחד|נקודת חוזק)[:\s]+([^,\n]+)/);
  const mainAdvantage = advantageMatch ? advantageMatch[1].trim() : '';

  return {
    name,
    stars,
    area,
    type,
    targetAudience: targetAudience.length > 0 ? targetAudience : [type],
    mainAdvantage,
  };
}

function parseAttractionsSection(text: string): AttractionData[] {
  const attractions: AttractionData[] = [];

  // Find category subsections
  const categories = text.split(/\n(?=[-•*]?\s*(?:אייקון|תרבות|טבע|קניות|לילה|משפח|ייחוד))/i);

  let currentCategory: AttractionData['category'] = 'iconic';

  for (const section of categories) {
    // Detect category from header
    for (const [pattern, cat] of Object.entries(ATTRACTION_CATEGORY_PATTERNS)) {
      if (section.toLowerCase().includes(pattern)) {
        currentCategory = cat;
        break;
      }
    }

    // Parse entries
    const entries = section.split(/\n(?=[-•*]|\d+\.)/).filter(e => e.trim().length > 5);

    for (const entry of entries) {
      const attraction = parseAttractionEntry(entry, currentCategory);
      if (attraction && attraction.name) {
        attractions.push(attraction);
      }
    }
  }

  return attractions;
}

function parseAttractionEntry(text: string, defaultCategory: AttractionData['category']): AttractionData | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const nameLine = lines[0].replace(/^[-•*\d.]\s*/, '');
  const name = nameLine.split(/[-–:]/)[0].trim();

  if (!name || name.length < 2) return null;

  // Check if free
  const isFree = /חינם|בחינם|free|ללא תשלום/i.test(text);

  // Extract duration
  const durationMatch = text.match(/(\d+[-–]\d+|\d+)\s*(?:שעות?|דקות?|hours?|minutes?)/i);
  const duration = durationMatch ? durationMatch[0] : '1-2 שעות';

  // Extract description
  const description = lines.slice(1).find(l => l.length > 20) || '';

  // Extract target audience
  const targetAudience = extractList(text, /מתאים|למי|קהל/);

  return {
    name,
    category: defaultCategory,
    description,
    duration,
    targetAudience: targetAudience.length > 0 ? targetAudience : ['כולם'],
    isFree,
  };
}

function parseRestaurantsSection(text: string): RestaurantData[] {
  const restaurants: RestaurantData[] = [];

  let currentCategory: RestaurantData['category'] = 'local';

  // Split by category headers
  const sections = text.split(/\n(?=[-•*]?\s*(?:fine|פיין|מקומי|בינלאומי|קז|כשר|קפה))/i);

  for (const section of sections) {
    // Detect category
    for (const [pattern, cat] of Object.entries(RESTAURANT_CATEGORY_PATTERNS)) {
      if (section.toLowerCase().includes(pattern)) {
        currentCategory = cat;
        break;
      }
    }

    const entries = section.split(/\n(?=[-•*]|\d+\.)/).filter(e => e.trim().length > 5);

    for (const entry of entries) {
      const restaurant = parseRestaurantEntry(entry, currentCategory);
      if (restaurant && restaurant.name) {
        restaurants.push(restaurant);
      }
    }
  }

  return restaurants;
}

function parseRestaurantEntry(text: string, defaultCategory: RestaurantData['category']): RestaurantData | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const nameLine = lines[0].replace(/^[-•*\d.]\s*/, '');
  const name = nameLine.split(/[-–:]/)[0].trim();

  if (!name || name.length < 2) return null;

  // Extract price range
  const priceMatch = text.match(/(\$+|₪\d+[-–]\d+|\d+[-–]\d+\s*₪|זול|בינוני|יקר)/);
  const priceRange = priceMatch ? priceMatch[0] : '$$';

  // Extract area
  const areaMatch = text.match(/(?:אזור|באזור|ב[-–])\s*([^,\n]+)/);
  const area = areaMatch ? areaMatch[1].trim() : '';

  // Extract cuisine
  const cuisineMatch = text.match(/(?:מטבח|סגנון|cuisine)[:\s]+([^,\n]+)/i);
  const cuisine = cuisineMatch ? cuisineMatch[1].trim() : '';

  // Extract why good
  const whyMatch = text.match(/(?:למה|מיוחד|ידוע|נחשב)[:\s]+([^,\n]+)/);
  const whyGood = whyMatch ? whyMatch[1].trim() : '';

  return {
    name,
    category: defaultCategory,
    cuisine,
    priceRange,
    area,
    whyGood,
  };
}

function parseFreeActivitiesSection(text: string): FreeActivityData[] {
  const activities: FreeActivityData[] = [];

  const entries = text.split(/\n(?=[-•*]|\d+\.)/).filter(e => e.trim().length > 5);

  for (const entry of entries) {
    const lines = entry.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const nameLine = lines[0].replace(/^[-•*\d.]\s*/, '');
    const name = nameLine.split(/[-–:]/)[0].trim();

    if (!name || name.length < 2) continue;

    // Detect type
    let type: FreeActivityData['type'] = 'experience';
    if (/שכונ/i.test(entry)) type = 'neighborhood';
    else if (/פארק|גן/i.test(entry)) type = 'park';
    else if (/תצפית|מבט/i.test(entry)) type = 'viewpoint';
    else if (/אירוע|פסטיבל/i.test(entry)) type = 'event';
    else if (/אתר|מוזיאון/i.test(entry)) type = 'site';

    activities.push({
      name,
      type,
      description: lines.slice(1).join(' ').slice(0, 200),
    });
  }

  return activities;
}

function parseLocalLawsSection(text: string): LocalLawData[] {
  const laws: LocalLawData[] = [];

  const entries = text.split(/\n(?=[-•*]|\d+\.)/).filter(e => e.trim().length > 10);

  for (const entry of entries) {
    const rule = entry.replace(/^[-•*\d.]\s*/, '').trim();
    if (!rule) continue;

    // Detect category
    let category: LocalLawData['category'] = 'behavior';
    if (/לבוש|בגד/i.test(rule)) category = 'dress';
    else if (/אלכוהול|שתייה/i.test(rule)) category = 'alcohol';
    else if (/צילום|מצלמ/i.test(rule)) category = 'photography';
    else if (/בטיחות|זהיר/i.test(rule)) category = 'safety';
    else if (/תרבות|כבוד|מנהג/i.test(rule)) category = 'cultural';

    // Detect importance
    let importance: LocalLawData['importance'] = 'recommended';
    if (/חובה|אסור|קנס/i.test(rule)) importance = 'critical';
    else if (/חשוב|מומלץ מאוד/i.test(rule)) importance = 'important';

    // Extract penalty
    const penaltyMatch = rule.match(/קנס[:\s]+([^,\n]+)/);

    laws.push({
      category,
      rule: rule.replace(/קנס[:\s]+[^,\n]+/, '').trim(),
      penalty: penaltyMatch ? penaltyMatch[1] : undefined,
      importance,
    });
  }

  return laws;
}

function parsePracticalInfoSection(text: string): PracticalInfo {
  return {
    recommendedAreas: extractRecommendedAreas(text),
    transportation: extractList(text, /תחבורה|הגעה|איך להגיע/),
    tips: extractList(text, /טיפ|המלצה|כדאי/),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function detectLanguage(text: string): 'he' | 'en' | 'ar' {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

  if (hebrewChars > arabicChars && hebrewChars > englishChars) return 'he';
  if (arabicChars > hebrewChars && arabicChars > englishChars) return 'ar';
  return 'en';
}

function extractDestinationInfo(document: ParsedDocument): { destination: string; country: string } {
  const text = document.rawText.slice(0, 500);

  // Look for destination pattern
  const destMatch = text.match(/יעד(?:\s*למחקר)?[:\s]+([^\n]+)/i) ||
                    text.match(/destination[:\s]+([^\n]+)/i);

  const countryMatch = text.match(/מדינה[:\s]+([^\n]+)/i) ||
                       text.match(/country[:\s]+([^\n]+)/i);

  return {
    destination: destMatch ? destMatch[1].trim() : document.metadata.title || 'Unknown',
    country: countryMatch ? countryMatch[1].trim() : '',
  };
}

function extractValue(text: string, pattern: RegExp): string {
  const match = text.match(new RegExp(`(?:${pattern.source})[:\\s]+([^\\n]+)`, 'i'));
  return match ? match[1].trim() : '';
}

function extractList(text: string, pattern: RegExp): string[] {
  const section = text.match(new RegExp(`(?:${pattern.source})[:\\s]*([^\\n]+(?:\\n[-•*]\\s*[^\\n]+)*)`, 'i'));
  if (!section) return [];

  return section[1]
    .split(/[,،;]|\n[-•*]\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 100);
}

function extractRecommendedAreas(text: string): PracticalInfo['recommendedAreas'] {
  const areas: PracticalInfo['recommendedAreas'] = [];
  const pattern = /(?:אזור|שכונ)[:\s]*([^-\n]+)(?:[-–]\s*)?(?:מתאים ל|ל)?([^,\n]*)/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    areas.push({
      name: match[1].trim(),
      forWhom: match[2]?.trim() || 'כולם',
      why: '',
    });
  }

  return areas;
}

function extractNeighborhoods(
  text: string,
  hotels: HotelData[],
  restaurants: RestaurantData[],
  attractions: AttractionData[]
): NeighborhoodData[] {
  // Collect unique areas from all entities
  const areaSet = new Set<string>();

  hotels.forEach(h => h.area && areaSet.add(h.area));
  restaurants.forEach(r => r.area && areaSet.add(r.area));
  attractions.forEach(a => a.area && areaSet.add(a.area));

  // Also look for explicit neighborhood mentions
  const neighborhoodPattern = /(?:שכונת?|אזור)\s+([א-ת\w\s]+?)(?:\s*[-–,\n])/gi;
  let neighborhoodMatch;
  while ((neighborhoodMatch = neighborhoodPattern.exec(text)) !== null) {
    const name = neighborhoodMatch[1].trim();
    if (name.length > 2 && name.length < 50) {
      areaSet.add(name);
    }
  }

  return Array.from(areaSet).map(name => ({
    name,
    description: '',
    forWhom: [],
    highlights: [],
    hotelCount: hotels.filter(h => h.area === name).length,
    restaurantCount: restaurants.filter(r => r.area === name).length,
  }));
}

function calculateCompleteness(data: {
  overview: DestinationOverview;
  hotels: HotelData[];
  attractions: AttractionData[];
  restaurants: RestaurantData[];
  freeActivities: FreeActivityData[];
  localLaws: LocalLawData[];
  practicalInfo: PracticalInfo;
}): number {
  let score = 0;

  // Overview (20 points)
  if (data.overview.description) score += 5;
  if (data.overview.targetAudiences.length > 0) score += 5;
  if (data.overview.bestSeasons.length > 0) score += 5;
  if (data.overview.competitiveAdvantages.length > 0) score += 5;

  // Hotels (20 points)
  score += Math.min(20, data.hotels.length * 2);

  // Attractions (20 points)
  score += Math.min(20, data.attractions.length);

  // Restaurants (20 points)
  score += Math.min(20, data.restaurants.length / 2);

  // Other (20 points)
  score += Math.min(10, data.freeActivities.length);
  score += Math.min(5, data.localLaws.length);
  score += Math.min(5, data.practicalInfo.recommendedAreas.length);

  return Math.min(100, score);
}

/**
 * Get parsing statistics
 */
export function getResearchStats(research: ParsedResearch): {
  destination: string;
  completeness: number;
  entities: Record<string, number>;
  neighborhoods: string[];
  missingData: string[];
} {
  const missingData: string[] = [];

  if (!research.overview.description) missingData.push('תיאור יעד');
  if (research.hotels.length === 0) missingData.push('מלונות');
  if (research.attractions.length === 0) missingData.push('אטרקציות');
  if (research.restaurants.length === 0) missingData.push('מסעדות');
  if (research.neighborhoods.length === 0) missingData.push('שכונות');

  return {
    destination: research.destination,
    completeness: research.metadata.completeness,
    entities: {
      hotels: research.hotels.length,
      attractions: research.attractions.length,
      restaurants: research.restaurants.length,
      freeActivities: research.freeActivities.length,
      neighborhoods: research.neighborhoods.length,
    },
    neighborhoods: research.neighborhoods.map(n => n.name),
    missingData,
  };
}
