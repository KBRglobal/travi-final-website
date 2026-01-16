/**
 * Octopus Engine - Auto Tagger
 * Automatically tags content for website sections and categories
 */

import type { ParsedResearch, HotelData, AttractionData, RestaurantData } from './research-parser';

// ============================================================================
// Types
// ============================================================================

export interface ContentTag {
  type: 'category' | 'audience' | 'price' | 'area' | 'season' | 'activity' | 'style';
  value: string;
  slug: string;
  confidence: number;
}

export interface TaggedEntity {
  id: string;
  name: string;
  entityType: 'hotel' | 'restaurant' | 'attraction' | 'neighborhood' | 'activity';
  tags: ContentTag[];
  primaryCategory: string;
  websiteSections: string[];
  urlPath: string;
  relatedTags: string[];
}

export interface WebsiteSection {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  entityTypes: string[];
  urlPattern: string;
}

// ============================================================================
// Website Sections Configuration
// ============================================================================

export const WEBSITE_SECTIONS: WebsiteSection[] = [
  // Main sections
  { id: 'hotels', name: 'מלונות', slug: 'hotels', entityTypes: ['hotel'], urlPattern: '/{destination}/hotels/{slug}' },
  { id: 'restaurants', name: 'מסעדות', slug: 'restaurants', entityTypes: ['restaurant'], urlPattern: '/{destination}/restaurants/{slug}' },
  { id: 'attractions', name: 'אטרקציות', slug: 'attractions', entityTypes: ['attraction'], urlPattern: '/{destination}/attractions/{slug}' },
  { id: 'neighborhoods', name: 'שכונות', slug: 'neighborhoods', entityTypes: ['neighborhood'], urlPattern: '/{destination}/neighborhoods/{slug}' },

  // Hotel sub-sections
  { id: 'luxury-hotels', name: 'מלונות יוקרה', slug: 'luxury-hotels', parentId: 'hotels', entityTypes: ['hotel'], urlPattern: '/{destination}/hotels/luxury/{slug}' },
  { id: 'boutique-hotels', name: 'מלונות בוטיק', slug: 'boutique-hotels', parentId: 'hotels', entityTypes: ['hotel'], urlPattern: '/{destination}/hotels/boutique/{slug}' },
  { id: 'family-hotels', name: 'מלונות למשפחות', slug: 'family-hotels', parentId: 'hotels', entityTypes: ['hotel'], urlPattern: '/{destination}/hotels/family/{slug}' },
  { id: 'business-hotels', name: 'מלונות עסקים', slug: 'business-hotels', parentId: 'hotels', entityTypes: ['hotel'], urlPattern: '/{destination}/hotels/business/{slug}' },

  // Restaurant sub-sections
  { id: 'fine-dining', name: 'פיין דיינינג', slug: 'fine-dining', parentId: 'restaurants', entityTypes: ['restaurant'], urlPattern: '/{destination}/restaurants/fine-dining/{slug}' },
  { id: 'local-food', name: 'אוכל מקומי', slug: 'local-food', parentId: 'restaurants', entityTypes: ['restaurant'], urlPattern: '/{destination}/restaurants/local/{slug}' },
  { id: 'kosher', name: 'כשר', slug: 'kosher', parentId: 'restaurants', entityTypes: ['restaurant'], urlPattern: '/{destination}/restaurants/kosher/{slug}' },

  // Attraction sub-sections
  { id: 'must-see', name: 'חובה לראות', slug: 'must-see', parentId: 'attractions', entityTypes: ['attraction'], urlPattern: '/{destination}/attractions/must-see/{slug}' },
  { id: 'free-activities', name: 'פעילויות חינם', slug: 'free', parentId: 'attractions', entityTypes: ['attraction'], urlPattern: '/{destination}/attractions/free/{slug}' },
  { id: 'family-activities', name: 'למשפחות', slug: 'family', parentId: 'attractions', entityTypes: ['attraction'], urlPattern: '/{destination}/attractions/family/{slug}' },
  { id: 'nightlife', name: 'חיי לילה', slug: 'nightlife', parentId: 'attractions', entityTypes: ['attraction'], urlPattern: '/{destination}/nightlife/{slug}' },
  { id: 'shopping', name: 'קניות', slug: 'shopping', parentId: 'attractions', entityTypes: ['attraction'], urlPattern: '/{destination}/shopping/{slug}' },

  // Guides
  { id: 'guides', name: 'מדריכים', slug: 'guides', entityTypes: ['article'], urlPattern: '/{destination}/guides/{slug}' },
  { id: 'itineraries', name: 'מסלולים', slug: 'itineraries', entityTypes: ['article'], urlPattern: '/{destination}/itineraries/{slug}' },
  { id: 'tips', name: 'טיפים', slug: 'tips', entityTypes: ['article'], urlPattern: '/{destination}/tips/{slug}' },
];

// ============================================================================
// Tag Definitions
// ============================================================================

const AUDIENCE_TAGS: Record<string, string[]> = {
  'couples': ['זוגות', 'רומנטי', 'זוג', 'הנימון', 'couples', 'romantic'],
  'families': ['משפחות', 'ילדים', 'משפחה', 'family', 'kids', 'children'],
  'business': ['עסקים', 'עסקי', 'כנסים', 'business', 'corporate'],
  'backpackers': ['תרמילאים', 'תרמיל', 'budget', 'backpack', 'hostel'],
  'luxury': ['יוקרה', 'יוקרתי', 'פרימיום', 'luxury', 'premium', 'vip'],
  'solo': ['יחיד', 'סולו', 'לבד', 'solo', 'single'],
  'seniors': ['מבוגרים', 'גיל הזהב', 'seniors', 'elderly'],
  'adventure': ['אקסטרים', 'הרפתקאות', 'אדרנלין', 'adventure', 'extreme'],
};

const PRICE_TAGS: Record<string, string[]> = {
  'budget': ['זול', 'תקציבי', 'חסכוני', '$', 'budget', 'cheap'],
  'moderate': ['בינוני', 'סביר', '$$', 'moderate', 'mid-range'],
  'expensive': ['יקר', 'גבוה', '$$$', 'expensive', 'high-end'],
  'luxury': ['יוקרתי', 'פרימיום', '$$$$', 'luxury', 'premium'],
};

const ACTIVITY_TAGS: Record<string, string[]> = {
  'beach': ['חוף', 'ים', 'בריכה', 'beach', 'pool', 'sea'],
  'culture': ['תרבות', 'מוזיאון', 'היסטוריה', 'culture', 'museum', 'history'],
  'nature': ['טבע', 'הר', 'פארק', 'nature', 'park', 'mountain'],
  'shopping': ['קניות', 'שופינג', 'מרכז קניות', 'shopping', 'mall'],
  'food': ['אוכל', 'קולינרי', 'מסעדות', 'food', 'culinary', 'dining'],
  'nightlife': ['לילה', 'מועדון', 'בר', 'nightlife', 'club', 'bar'],
  'spa': ['ספא', 'עיסוי', 'פינוק', 'spa', 'massage', 'wellness'],
  'sports': ['ספורט', 'אקטיבי', 'פעילות', 'sports', 'active', 'fitness'],
};

const SEASON_TAGS: Record<string, string[]> = {
  'summer': ['קיץ', 'חם', 'summer', 'hot'],
  'winter': ['חורף', 'קר', 'winter', 'cold'],
  'spring': ['אביב', 'spring'],
  'fall': ['סתיו', 'fall', 'autumn'],
  'year-round': ['כל השנה', 'year-round', 'all year'],
};

// ============================================================================
// Main Tagging Functions
// ============================================================================

/**
 * Tag all entities from parsed research
 */
export function tagAllEntities(research: ParsedResearch): TaggedEntity[] {
  const taggedEntities: TaggedEntity[] = [];
  const destination = slugify(research.destination);

  // Tag hotels
  for (const hotel of research.hotels) {
    taggedEntities.push(tagHotel(hotel, destination));
  }

  // Tag restaurants
  for (const restaurant of research.restaurants) {
    taggedEntities.push(tagRestaurant(restaurant, destination));
  }

  // Tag attractions
  for (const attraction of research.attractions) {
    taggedEntities.push(tagAttraction(attraction, destination));
  }

  // Tag neighborhoods
  for (const neighborhood of research.neighborhoods) {
    taggedEntities.push({
      id: `neighborhood_${slugify(neighborhood.name)}`,
      name: neighborhood.name,
      entityType: 'neighborhood',
      tags: generateNeighborhoodTags(neighborhood),
      primaryCategory: 'neighborhoods',
      websiteSections: ['neighborhoods'],
      urlPath: `/${destination}/neighborhoods/${slugify(neighborhood.name)}`,
      relatedTags: [],
    });
  }

  // Tag free activities
  for (const activity of research.freeActivities) {
    taggedEntities.push({
      id: `activity_${slugify(activity.name)}`,
      name: activity.name,
      entityType: 'activity',
      tags: [
        { type: 'price', value: 'free', slug: 'free', confidence: 1 },
        { type: 'category', value: activity.type, slug: activity.type, confidence: 0.9 },
      ],
      primaryCategory: 'free-activities',
      websiteSections: ['free-activities', 'attractions'],
      urlPath: `/${destination}/attractions/free/${slugify(activity.name)}`,
      relatedTags: ['free', 'budget'],
    });
  }

  return taggedEntities;
}

/**
 * Tag a hotel
 */
function tagHotel(hotel: HotelData, destination: string): TaggedEntity {
  const tags: ContentTag[] = [];
  const websiteSections: string[] = ['hotels'];

  // Star rating tag
  tags.push({
    type: 'category',
    value: `${hotel.stars}-star`,
    slug: `${hotel.stars}-star`,
    confidence: 1,
  });

  // Type tag
  tags.push({
    type: 'style',
    value: hotel.type,
    slug: hotel.type,
    confidence: 0.95,
  });

  // Map to website sections
  if (hotel.type === 'luxury' || hotel.stars >= 5) {
    websiteSections.push('luxury-hotels');
  }
  if (hotel.type === 'boutique') {
    websiteSections.push('boutique-hotels');
  }
  if (hotel.type === 'family' || hotel.targetAudience.some(t => /משפח|family/i.test(t))) {
    websiteSections.push('family-hotels');
  }
  if (hotel.type === 'business') {
    websiteSections.push('business-hotels');
  }

  // Area tag
  if (hotel.area) {
    tags.push({
      type: 'area',
      value: hotel.area,
      slug: slugify(hotel.area),
      confidence: 0.9,
    });
  }

  // Audience tags
  for (const audience of hotel.targetAudience) {
    const audienceTag = findMatchingTag(audience, AUDIENCE_TAGS);
    if (audienceTag) {
      tags.push({
        type: 'audience',
        value: audienceTag,
        slug: audienceTag,
        confidence: 0.8,
      });
    }
  }

  return {
    id: `hotel_${slugify(hotel.name)}`,
    name: hotel.name,
    entityType: 'hotel',
    tags,
    primaryCategory: hotel.type,
    websiteSections,
    urlPath: `/${destination}/hotels/${slugify(hotel.name)}`,
    relatedTags: hotel.targetAudience.map(slugify),
  };
}

/**
 * Tag a restaurant
 */
function tagRestaurant(restaurant: RestaurantData, destination: string): TaggedEntity {
  const tags: ContentTag[] = [];
  const websiteSections: string[] = ['restaurants'];

  // Category tag
  tags.push({
    type: 'category',
    value: restaurant.category,
    slug: restaurant.category.replace('_', '-'),
    confidence: 0.95,
  });

  // Map to website sections
  if (restaurant.category === 'fine_dining') {
    websiteSections.push('fine-dining');
  }
  if (restaurant.category === 'local') {
    websiteSections.push('local-food');
  }
  if (restaurant.category === 'kosher') {
    websiteSections.push('kosher');
  }

  // Cuisine tag
  if (restaurant.cuisine) {
    tags.push({
      type: 'style',
      value: restaurant.cuisine,
      slug: slugify(restaurant.cuisine),
      confidence: 0.85,
    });
  }

  // Price tag
  const priceTag = findMatchingTag(restaurant.priceRange, PRICE_TAGS);
  if (priceTag) {
    tags.push({
      type: 'price',
      value: priceTag,
      slug: priceTag,
      confidence: 0.9,
    });
  }

  // Area tag
  if (restaurant.area) {
    tags.push({
      type: 'area',
      value: restaurant.area,
      slug: slugify(restaurant.area),
      confidence: 0.9,
    });
  }

  return {
    id: `restaurant_${slugify(restaurant.name)}`,
    name: restaurant.name,
    entityType: 'restaurant',
    tags,
    primaryCategory: restaurant.category,
    websiteSections,
    urlPath: `/${destination}/restaurants/${slugify(restaurant.name)}`,
    relatedTags: [restaurant.cuisine, restaurant.category].filter(Boolean).map(slugify),
  };
}

/**
 * Tag an attraction
 */
function tagAttraction(attraction: AttractionData, destination: string): TaggedEntity {
  const tags: ContentTag[] = [];
  const websiteSections: string[] = ['attractions'];

  // Category tag
  tags.push({
    type: 'category',
    value: attraction.category,
    slug: attraction.category,
    confidence: 0.95,
  });

  // Map to website sections
  if (attraction.category === 'iconic') {
    websiteSections.push('must-see');
  }
  if (attraction.category === 'family') {
    websiteSections.push('family-activities');
  }
  if (attraction.category === 'nightlife') {
    websiteSections.push('nightlife');
  }
  if (attraction.category === 'shopping') {
    websiteSections.push('shopping');
  }
  if (attraction.isFree) {
    websiteSections.push('free-activities');
    tags.push({
      type: 'price',
      value: 'free',
      slug: 'free',
      confidence: 1,
    });
  }

  // Audience tags
  for (const audience of attraction.targetAudience) {
    const audienceTag = findMatchingTag(audience, AUDIENCE_TAGS);
    if (audienceTag) {
      tags.push({
        type: 'audience',
        value: audienceTag,
        slug: audienceTag,
        confidence: 0.8,
      });
    }
  }

  // Activity type tags
  const text = `${attraction.name} ${attraction.description}`;
  for (const [tag, patterns] of Object.entries(ACTIVITY_TAGS)) {
    if (patterns.some(p => text.toLowerCase().includes(p.toLowerCase()))) {
      tags.push({
        type: 'activity',
        value: tag,
        slug: tag,
        confidence: 0.7,
      });
    }
  }

  return {
    id: `attraction_${slugify(attraction.name)}`,
    name: attraction.name,
    entityType: 'attraction',
    tags,
    primaryCategory: attraction.category,
    websiteSections,
    urlPath: `/${destination}/attractions/${slugify(attraction.name)}`,
    relatedTags: attraction.targetAudience.map(slugify),
  };
}

function generateNeighborhoodTags(neighborhood: any): ContentTag[] {
  const tags: ContentTag[] = [];

  tags.push({
    type: 'category',
    value: 'neighborhood',
    slug: 'neighborhood',
    confidence: 1,
  });

  // Detect characteristics from description
  const text = `${neighborhood.name} ${neighborhood.description || ''}`;

  for (const [tag, patterns] of Object.entries(ACTIVITY_TAGS)) {
    if (patterns.some(p => text.toLowerCase().includes(p.toLowerCase()))) {
      tags.push({
        type: 'activity',
        value: tag,
        slug: tag,
        confidence: 0.7,
      });
    }
  }

  return tags;
}

// ============================================================================
// Helper Functions
// ============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0590-\u05FF-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function findMatchingTag(text: string, tagMap: Record<string, string[]>): string | null {
  const lowerText = text.toLowerCase();

  for (const [tag, patterns] of Object.entries(tagMap)) {
    if (patterns.some(p => lowerText.includes(p.toLowerCase()))) {
      return tag;
    }
  }

  return null;
}

/**
 * Get all tags grouped by type
 */
export function getTagsByType(entities: TaggedEntity[]): Record<string, Set<string>> {
  const grouped: Record<string, Set<string>> = {};

  for (const entity of entities) {
    for (const tag of entity.tags) {
      if (!grouped[tag.type]) {
        grouped[tag.type] = new Set();
      }
      grouped[tag.type].add(tag.value);
    }
  }

  return grouped;
}

/**
 * Get entities by website section
 */
export function getEntitiesBySection(entities: TaggedEntity[]): Record<string, TaggedEntity[]> {
  const grouped: Record<string, TaggedEntity[]> = {};

  for (const entity of entities) {
    for (const section of entity.websiteSections) {
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(entity);
    }
  }

  return grouped;
}

/**
 * Generate URL paths for all entities
 */
export function generateSitemap(entities: TaggedEntity[], baseUrl: string): string[] {
  return entities.map(e => `${baseUrl}${e.urlPath}`);
}
