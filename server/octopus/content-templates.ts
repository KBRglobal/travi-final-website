/**
 * Octopus Engine - Content Templates
 * Hebrew content templates for maximum output generation
 * Generates actual content from parsed research data
 */

import type { ParsedResearch, HotelData, AttractionData, RestaurantData, NeighborhoodData } from './research-parser';
import type { TaggedEntity } from './auto-tagger';
import type { ContentPlan, EntityPagePlan, ArticlePagePlan, GuidePagePlan } from './bulk-generator';

// ============================================================================
// Types
// ============================================================================

export interface GeneratedContent {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  sections: ContentSection[];
  metadata: ContentMetadata;
  seo: SEOContent;
  aeo: AEOContent;
}

export interface ContentSection {
  id: string;
  heading: string;
  content: string;
  type: 'intro' | 'main' | 'list' | 'comparison' | 'tips' | 'faq' | 'cta';
}

export interface ContentMetadata {
  wordCount: number;
  readTime: number;
  language: 'he' | 'en' | 'ar';
  lastUpdated: string;
  author: string;
  category: string;
  tags: string[];
  relatedUrls: string[];
}

export interface SEOContent {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
}

export interface AEOContent {
  question: string;
  directAnswer: string;
  structuredData: Record<string, unknown>;
  speakableContent: string;
  citations: string[];
}

export type ContentType =
  | 'hotel-page'
  | 'restaurant-page'
  | 'attraction-page'
  | 'neighborhood-page'
  | 'top-list-article'
  | 'best-for-article'
  | 'guide-article'
  | 'itinerary-article'
  | 'comparison-article'
  | 'tips-article';

// ============================================================================
// Template Constants
// ============================================================================

const AUTHOR_NAME = 'צוות TRAVI';

const INTRO_TEMPLATES = {
  hotel: [
    'מחפשים מקום מושלם ללינה ב{destination}? {hotelName} הוא בחירה מעולה עבור {audience}.',
    '{hotelName} ב{destination} מציע חוויית אירוח {type} ברמה גבוהה.',
    'אם אתם מתכננים טיול ל{destination}, {hotelName} הוא אחד המלונות המומלצים ביותר.',
  ],
  restaurant: [
    'מחפשים איפה לאכול ב{destination}? {restaurantName} הוא מקום שחובה להכיר.',
    '{restaurantName} מציע חוויה קולינרית {category} ב{area} של {destination}.',
    'למי שאוהב {cuisine}, {restaurantName} ב{destination} הוא יעד חובה.',
  ],
  attraction: [
    '{attractionName} הוא אחד המקומות שחובה לבקר ב{destination}.',
    'אם אתם ב{destination}, אל תפספסו את {attractionName}.',
    '{attractionName} מציע חוויה {category} בלתי נשכחת ב{destination}.',
  ],
  neighborhood: [
    'שכונת {neighborhoodName} היא אחת האזורים המעניינים ביותר ב{destination}.',
    'מחפשים איפה להתאכסן ב{destination}? {neighborhoodName} יכולה להיות הבחירה המושלמת.',
    '{neighborhoodName} מציעה שילוב מנצח של {highlights}.',
  ],
};

const CTA_TEMPLATES = {
  hotel: 'מוכנים להזמין את החופשה שלכם? בדקו מחירים ותאריכים זמינים ב{hotelName}.',
  restaurant: 'רעבים? שריינו מקום ב{restaurantName} ותהנו מחוויה קולינרית מיוחדת.',
  attraction: 'מוכנים לחוויה? תכננו את הביקור ב{attractionName} עכשיו.',
  general: 'מתכננים טיול ל{destination}? צרו קשר לייעוץ אישי מהצוות שלנו.',
};

// ============================================================================
// Entity Page Templates
// ============================================================================

/**
 * Generate hotel page content
 */
export function generateHotelPageContent(
  hotel: HotelData,
  destination: string,
  enrichedData?: Record<string, unknown>
): GeneratedContent {
  const slug = slugify(hotel.name);
  const intro = fillTemplate(randomChoice(INTRO_TEMPLATES.hotel), {
    destination,
    hotelName: hotel.name,
    audience: hotel.targetAudience.join(' ו'),
    type: getHotelTypeHebrew(hotel.type),
  });

  const sections: ContentSection[] = [
    {
      id: 'intro',
      heading: '',
      content: intro,
      type: 'intro',
    },
    {
      id: 'overview',
      heading: `על ${hotel.name}`,
      content: generateHotelOverview(hotel, destination),
      type: 'main',
    },
    {
      id: 'location',
      heading: 'מיקום',
      content: generateLocationSection(hotel.area, destination),
      type: 'main',
    },
    {
      id: 'amenities',
      heading: 'שירותים ומתקנים',
      content: generateAmenitiesSection(hotel),
      type: 'list',
    },
    {
      id: 'audience',
      heading: 'למי מתאים?',
      content: generateAudienceSection(hotel.targetAudience, 'מלון'),
      type: 'main',
    },
    {
      id: 'tips',
      heading: 'טיפים לשהייה',
      content: generateHotelTips(hotel),
      type: 'tips',
    },
    {
      id: 'cta',
      heading: '',
      content: fillTemplate(CTA_TEMPLATES.hotel, { hotelName: hotel.name }),
      type: 'cta',
    },
  ];

  const fullContent = sections.map(s =>
    s.heading ? `## ${s.heading}\n\n${s.content}` : s.content
  ).join('\n\n');

  const wordCount = countWords(fullContent);

  return {
    id: `hotel_${slug}`,
    type: 'hotel-page',
    title: `${hotel.name} - מלון ${hotel.stars} כוכבים ב${destination}`,
    slug,
    content: fullContent,
    excerpt: intro.slice(0, 160),
    sections,
    metadata: {
      wordCount,
      readTime: Math.ceil(wordCount / 200),
      language: 'he',
      lastUpdated: new Date().toISOString(),
      author: AUTHOR_NAME,
      category: 'hotels',
      tags: [destination, hotel.type, `${hotel.stars}-stars`, ...hotel.targetAudience],
      relatedUrls: [],
    },
    seo: {
      title: `${hotel.name} | מלון ${hotel.stars} כוכבים ב${destination} | TRAVI`,
      description: `${hotel.name} - ${hotel.mainAdvantage}. מלון ${hotel.stars} כוכבים ב${hotel.area}, ${destination}. ${hotel.targetAudience.join(', ')}.`,
      keywords: [hotel.name, destination, 'מלון', `${hotel.stars} כוכבים`, hotel.area, ...hotel.targetAudience],
      canonicalUrl: `/${slugify(destination)}/hotels/${slug}`,
      ogTitle: `${hotel.name} - ${destination}`,
      ogDescription: intro,
    },
    aeo: {
      question: `מה דעתכם על ${hotel.name} ב${destination}?`,
      directAnswer: `${hotel.name} הוא מלון ${hotel.stars} כוכבים ב${hotel.area}, ${destination}. ${hotel.mainAdvantage}. מתאים במיוחד ל${hotel.targetAudience.join(' ול')}.`,
      structuredData: generateHotelSchema(hotel, destination),
      speakableContent: `${hotel.name} הוא מלון ${hotel.stars} כוכבים ב${destination}. ${hotel.mainAdvantage}.`,
      citations: [],
    },
  };
}

/**
 * Generate restaurant page content
 */
export function generateRestaurantPageContent(
  restaurant: RestaurantData,
  destination: string
): GeneratedContent {
  const slug = slugify(restaurant.name);
  const intro = fillTemplate(randomChoice(INTRO_TEMPLATES.restaurant), {
    destination,
    restaurantName: restaurant.name,
    category: getCategoryHebrew(restaurant.category),
    area: restaurant.area,
    cuisine: restaurant.cuisine,
  });

  const sections: ContentSection[] = [
    {
      id: 'intro',
      heading: '',
      content: intro,
      type: 'intro',
    },
    {
      id: 'overview',
      heading: `על ${restaurant.name}`,
      content: generateRestaurantOverview(restaurant, destination),
      type: 'main',
    },
    {
      id: 'menu',
      heading: 'מה מומלץ להזמין',
      content: generateMenuRecommendations(restaurant),
      type: 'list',
    },
    {
      id: 'practical',
      heading: 'מידע פרקטי',
      content: generateRestaurantPracticalInfo(restaurant),
      type: 'main',
    },
    {
      id: 'cta',
      heading: '',
      content: fillTemplate(CTA_TEMPLATES.restaurant, { restaurantName: restaurant.name }),
      type: 'cta',
    },
  ];

  const fullContent = sections.map(s =>
    s.heading ? `## ${s.heading}\n\n${s.content}` : s.content
  ).join('\n\n');

  const wordCount = countWords(fullContent);

  return {
    id: `restaurant_${slug}`,
    type: 'restaurant-page',
    title: `${restaurant.name} - מסעדת ${restaurant.cuisine} ב${destination}`,
    slug,
    content: fullContent,
    excerpt: intro.slice(0, 160),
    sections,
    metadata: {
      wordCount,
      readTime: Math.ceil(wordCount / 200),
      language: 'he',
      lastUpdated: new Date().toISOString(),
      author: AUTHOR_NAME,
      category: 'restaurants',
      tags: [destination, restaurant.cuisine, restaurant.category, restaurant.area],
      relatedUrls: [],
    },
    seo: {
      title: `${restaurant.name} | מסעדת ${restaurant.cuisine} ב${destination} | TRAVI`,
      description: `${restaurant.name} - ${restaurant.whyGood}. מסעדת ${restaurant.cuisine} ב${restaurant.area}, ${destination}. טווח מחירים: ${restaurant.priceRange}.`,
      keywords: [restaurant.name, destination, 'מסעדה', restaurant.cuisine, restaurant.area],
      canonicalUrl: `/${slugify(destination)}/restaurants/${slug}`,
      ogTitle: `${restaurant.name} - ${destination}`,
      ogDescription: intro,
    },
    aeo: {
      question: `איפה לאכול ${restaurant.cuisine} ב${destination}?`,
      directAnswer: `${restaurant.name} היא מסעדה מומלצת ל${restaurant.cuisine} ב${restaurant.area}, ${destination}. ${restaurant.whyGood}.`,
      structuredData: generateRestaurantSchema(restaurant, destination),
      speakableContent: `${restaurant.name} היא מסעדת ${restaurant.cuisine} ב${destination}. ${restaurant.whyGood}.`,
      citations: [],
    },
  };
}

/**
 * Generate attraction page content
 */
export function generateAttractionPageContent(
  attraction: AttractionData,
  destination: string
): GeneratedContent {
  const slug = slugify(attraction.name);
  const intro = fillTemplate(randomChoice(INTRO_TEMPLATES.attraction), {
    destination,
    attractionName: attraction.name,
    category: getAttractionCategoryHebrew(attraction.category),
  });

  const sections: ContentSection[] = [
    {
      id: 'intro',
      heading: '',
      content: intro,
      type: 'intro',
    },
    {
      id: 'overview',
      heading: `על ${attraction.name}`,
      content: attraction.description || generateAttractionOverview(attraction, destination),
      type: 'main',
    },
    {
      id: 'visit-info',
      heading: 'מידע לביקור',
      content: generateVisitInfo(attraction),
      type: 'main',
    },
    {
      id: 'tips',
      heading: 'טיפים לביקור',
      content: generateAttractionTips(attraction),
      type: 'tips',
    },
    {
      id: 'cta',
      heading: '',
      content: fillTemplate(CTA_TEMPLATES.attraction, { attractionName: attraction.name }),
      type: 'cta',
    },
  ];

  const fullContent = sections.map(s =>
    s.heading ? `## ${s.heading}\n\n${s.content}` : s.content
  ).join('\n\n');

  const wordCount = countWords(fullContent);

  return {
    id: `attraction_${slug}`,
    type: 'attraction-page',
    title: `${attraction.name} - אטרקציה ב${destination}`,
    slug,
    content: fullContent,
    excerpt: intro.slice(0, 160),
    sections,
    metadata: {
      wordCount,
      readTime: Math.ceil(wordCount / 200),
      language: 'he',
      lastUpdated: new Date().toISOString(),
      author: AUTHOR_NAME,
      category: 'attractions',
      tags: [destination, attraction.category, ...attraction.targetAudience],
      relatedUrls: [],
    },
    seo: {
      title: `${attraction.name} | אטרקציה ב${destination} | TRAVI`,
      description: `${attraction.name} - ${attraction.description?.slice(0, 100) || 'אטרקציה מומלצת'}. משך ביקור: ${attraction.duration}. ${attraction.isFree ? 'כניסה חופשית!' : ''}`,
      keywords: [attraction.name, destination, 'אטרקציה', attraction.category],
      canonicalUrl: `/${slugify(destination)}/attractions/${slug}`,
      ogTitle: `${attraction.name} - ${destination}`,
      ogDescription: intro,
    },
    aeo: {
      question: `מה זה ${attraction.name} ב${destination}?`,
      directAnswer: `${attraction.name} הוא ${getAttractionCategoryHebrew(attraction.category)} ב${destination}. ${attraction.description || ''} משך ביקור מומלץ: ${attraction.duration}.`,
      structuredData: generateAttractionSchema(attraction, destination),
      speakableContent: `${attraction.name} הוא אטרקציה ב${destination}. משך ביקור מומלץ: ${attraction.duration}.`,
      citations: [],
    },
  };
}

// ============================================================================
// Article Templates
// ============================================================================

/**
 * Generate top list article
 */
export function generateTopListArticle(
  plan: ArticlePagePlan,
  entities: Array<HotelData | RestaurantData | AttractionData>,
  destination: string
): GeneratedContent {
  const slug = plan.slug;
  const entityType = inferEntityType(entities[0]);

  const intro = `מחפשים את ה${entityType} הטובים ביותר ב${destination}? הכנו עבורכם רשימה מקיפה של ${entities.length} המקומות המומלצים ביותר, עם כל המידע שתצטרכו לתכנון מושלם.`;

  const sections: ContentSection[] = [
    {
      id: 'intro',
      heading: '',
      content: intro,
      type: 'intro',
    },
  ];

  // Add each entity as a section
  entities.forEach((entity, index) => {
    sections.push({
      id: `item-${index + 1}`,
      heading: `${index + 1}. ${entity.name}`,
      content: generateEntitySummary(entity, entityType),
      type: 'main',
    });
  });

  // Add summary section
  sections.push({
    id: 'summary',
    heading: 'סיכום',
    content: `אלה היו ${entities.length} ה${entityType} המומלצים ביותר ב${destination}. כל אחד מהם מציע חוויה ייחודית, ובחרנו אותם בקפידה כדי להתאים לסגנונות וטעמים שונים.`,
    type: 'main',
  });

  sections.push({
    id: 'cta',
    heading: '',
    content: fillTemplate(CTA_TEMPLATES.general, { destination }),
    type: 'cta',
  });

  const fullContent = sections.map(s =>
    s.heading ? `## ${s.heading}\n\n${s.content}` : s.content
  ).join('\n\n');

  const wordCount = countWords(fullContent);

  return {
    id: `article_${slug}`,
    type: 'top-list-article',
    title: plan.title,
    slug,
    content: fullContent,
    excerpt: intro.slice(0, 160),
    sections,
    metadata: {
      wordCount,
      readTime: Math.ceil(wordCount / 200),
      language: 'he',
      lastUpdated: new Date().toISOString(),
      author: AUTHOR_NAME,
      category: 'guides',
      tags: [destination, entityType, 'מדריך', 'רשימה'],
      relatedUrls: [],
    },
    seo: {
      title: `${plan.title} | TRAVI`,
      description: `${entities.length} ה${entityType} הטובים ביותר ב${destination}. מדריך מקיף עם המלצות, טיפים ומידע מעשי לתכנון הטיול שלכם.`,
      keywords: [destination, entityType, 'מומלצים', 'הכי טוב', 'רשימה'],
      canonicalUrl: plan.urlPath,
      ogTitle: plan.title,
      ogDescription: intro,
    },
    aeo: {
      question: `מה ה${entityType} הכי טובים ב${destination}?`,
      directAnswer: `ה${entityType} המומלצים ביותר ב${destination} כוללים: ${entities.slice(0, 3).map(e => e.name).join(', ')}, ועוד.`,
      structuredData: generateListSchema(plan.title, entities, destination),
      speakableContent: `ה${entityType} הכי טובים ב${destination} הם ${entities.slice(0, 3).map(e => e.name).join(', ')}.`,
      citations: [],
    },
  };
}

/**
 * Generate itinerary article
 */
export function generateItineraryArticle(
  days: number,
  attractions: AttractionData[],
  destination: string
): GeneratedContent {
  const slug = `${days}-days-${slugify(destination)}`;
  const title = `${days} ימים ב${destination} - מסלול מומלץ`;

  const intro = `מתכננים טיול של ${days} ימים ב${destination}? הכנו עבורכם מסלול מפורט שיעזור לכם להפיק את המרב מהביקור, עם כל האטרקציות המומלצות מחולקות לימים.`;

  const sections: ContentSection[] = [
    {
      id: 'intro',
      heading: '',
      content: intro,
      type: 'intro',
    },
  ];

  // Distribute attractions across days
  const attractionsPerDay = Math.ceil(attractions.length / days);

  for (let day = 1; day <= days; day++) {
    const dayAttractions = attractions.slice(
      (day - 1) * attractionsPerDay,
      day * attractionsPerDay
    );

    if (dayAttractions.length === 0) continue;

    sections.push({
      id: `day-${day}`,
      heading: `יום ${day}`,
      content: generateDayItinerary(day, dayAttractions, destination),
      type: 'main',
    });
  }

  // Add practical tips
  sections.push({
    id: 'tips',
    heading: 'טיפים למסלול',
    content: generateItineraryTips(days, destination),
    type: 'tips',
  });

  sections.push({
    id: 'cta',
    heading: '',
    content: fillTemplate(CTA_TEMPLATES.general, { destination }),
    type: 'cta',
  });

  const fullContent = sections.map(s =>
    s.heading ? `## ${s.heading}\n\n${s.content}` : s.content
  ).join('\n\n');

  const wordCount = countWords(fullContent);

  return {
    id: `itinerary_${slug}`,
    type: 'itinerary-article',
    title,
    slug,
    content: fullContent,
    excerpt: intro.slice(0, 160),
    sections,
    metadata: {
      wordCount,
      readTime: Math.ceil(wordCount / 200),
      language: 'he',
      lastUpdated: new Date().toISOString(),
      author: AUTHOR_NAME,
      category: 'itineraries',
      tags: [destination, 'מסלול', `${days} ימים`, 'תכנון טיול'],
      relatedUrls: [],
    },
    seo: {
      title: `${title} | TRAVI`,
      description: `מסלול מפורט ל-${days} ימים ב${destination}. כל האטרקציות המומלצות, סדר ביקור מומלץ וטיפים מעשיים.`,
      keywords: [destination, 'מסלול', `${days} ימים`, 'אטרקציות', 'תכנון'],
      canonicalUrl: `/${slugify(destination)}/itineraries/${days}-days`,
      ogTitle: title,
      ogDescription: intro,
    },
    aeo: {
      question: `מה לעשות ב${destination} ב-${days} ימים?`,
      directAnswer: `ב-${days} ימים ב${destination} מומלץ לבקר ב: ${attractions.slice(0, 5).map(a => a.name).join(', ')}. המסלול המלא כולל ${attractions.length} אטרקציות מחולקות לימים.`,
      structuredData: generateItinerarySchema(title, days, attractions, destination),
      speakableContent: `מסלול ל-${days} ימים ב${destination} כולל ${attractions.length} אטרקציות מומלצות.`,
      citations: [],
    },
  };
}

/**
 * Generate neighborhood guide
 */
export function generateNeighborhoodGuide(
  neighborhood: NeighborhoodData,
  hotels: HotelData[],
  restaurants: RestaurantData[],
  attractions: AttractionData[],
  destination: string
): GeneratedContent {
  const slug = `${slugify(neighborhood.name)}-guide`;
  const title = `מדריך שכונת ${neighborhood.name} ב${destination}`;

  const intro = fillTemplate(randomChoice(INTRO_TEMPLATES.neighborhood), {
    destination,
    neighborhoodName: neighborhood.name,
    highlights: neighborhood.highlights.join(', '),
  });

  const sections: ContentSection[] = [
    {
      id: 'intro',
      heading: '',
      content: intro,
      type: 'intro',
    },
    {
      id: 'overview',
      heading: `על ${neighborhood.name}`,
      content: neighborhood.description || `${neighborhood.name} היא אחת השכונות המעניינות ב${destination}. ${neighborhood.forWhom.length > 0 ? `מתאימה במיוחד ל${neighborhood.forWhom.join(' ול')}.` : ''}`,
      type: 'main',
    },
  ];

  // Hotels section
  if (hotels.length > 0) {
    sections.push({
      id: 'hotels',
      heading: `איפה לישון ב${neighborhood.name}`,
      content: generateNeighborhoodHotels(hotels, neighborhood.name),
      type: 'list',
    });
  }

  // Restaurants section
  if (restaurants.length > 0) {
    sections.push({
      id: 'restaurants',
      heading: `איפה לאכול ב${neighborhood.name}`,
      content: generateNeighborhoodRestaurants(restaurants, neighborhood.name),
      type: 'list',
    });
  }

  // Attractions section
  if (attractions.length > 0) {
    sections.push({
      id: 'attractions',
      heading: `מה לעשות ב${neighborhood.name}`,
      content: generateNeighborhoodAttractions(attractions, neighborhood.name),
      type: 'list',
    });
  }

  sections.push({
    id: 'cta',
    heading: '',
    content: fillTemplate(CTA_TEMPLATES.general, { destination }),
    type: 'cta',
  });

  const fullContent = sections.map(s =>
    s.heading ? `## ${s.heading}\n\n${s.content}` : s.content
  ).join('\n\n');

  const wordCount = countWords(fullContent);

  return {
    id: `neighborhood_${slug}`,
    type: 'guide-article',
    title,
    slug,
    content: fullContent,
    excerpt: intro.slice(0, 160),
    sections,
    metadata: {
      wordCount,
      readTime: Math.ceil(wordCount / 200),
      language: 'he',
      lastUpdated: new Date().toISOString(),
      author: AUTHOR_NAME,
      category: 'neighborhoods',
      tags: [destination, neighborhood.name, 'שכונה', 'מדריך'],
      relatedUrls: [],
    },
    seo: {
      title: `${title} | TRAVI`,
      description: `מדריך מקיף לשכונת ${neighborhood.name} ב${destination}. מלונות, מסעדות, אטרקציות וטיפים.`,
      keywords: [destination, neighborhood.name, 'שכונה', 'איפה לגור', 'מדריך'],
      canonicalUrl: `/${slugify(destination)}/neighborhoods/${slugify(neighborhood.name)}/guide`,
      ogTitle: title,
      ogDescription: intro,
    },
    aeo: {
      question: `מה יש בשכונת ${neighborhood.name} ב${destination}?`,
      directAnswer: `${neighborhood.name} ב${destination} מציעה ${hotels.length} מלונות, ${restaurants.length} מסעדות ו-${attractions.length} אטרקציות. ${neighborhood.forWhom.length > 0 ? `מתאימה ל${neighborhood.forWhom.join(' ול')}.` : ''}`,
      structuredData: generateNeighborhoodSchema(neighborhood, destination),
      speakableContent: `שכונת ${neighborhood.name} ב${destination} היא בחירה מצוינת עם ${hotels.length} מלונות ו-${restaurants.length} מסעדות.`,
      citations: [],
    },
  };
}

// ============================================================================
// Bulk Generation
// ============================================================================

/**
 * Generate all content from research and content plan
 */
export function generateAllContent(
  research: ParsedResearch,
  plan: ContentPlan
): GeneratedContent[] {
  const content: GeneratedContent[] = [];
  const destination = research.destination;

  // Generate entity pages
  for (const hotel of research.hotels) {
    content.push(generateHotelPageContent(hotel, destination));
  }

  for (const restaurant of research.restaurants) {
    content.push(generateRestaurantPageContent(restaurant, destination));
  }

  for (const attraction of research.attractions) {
    content.push(generateAttractionPageContent(attraction, destination));
  }

  // Generate top list articles
  for (const articlePlan of plan.articlePages.filter(a => a.type === 'top-list')) {
    const entities = findEntities(articlePlan.entities, research);
    if (entities.length >= 3) {
      content.push(generateTopListArticle(articlePlan, entities, destination));
    }
  }

  // Generate itineraries
  for (const articlePlan of plan.articlePages.filter(a => a.type === 'itinerary')) {
    const daysMatch = articlePlan.slug.match(/^(\d+)-days/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      content.push(generateItineraryArticle(days, research.attractions, destination));
    }
  }

  // Generate neighborhood guides
  for (const neighborhood of research.neighborhoods) {
    const areaHotels = research.hotels.filter(h => h.area === neighborhood.name);
    const areaRestaurants = research.restaurants.filter(r => r.area === neighborhood.name);
    const areaAttractions = research.attractions.filter(a => a.area === neighborhood.name);

    if (areaHotels.length > 0 || areaRestaurants.length > 0) {
      content.push(generateNeighborhoodGuide(
        neighborhood,
        areaHotels,
        areaRestaurants,
        areaAttractions,
        destination
      ));
    }
  }

  return content;
}

/**
 * Get content generation statistics
 */
export function getContentStats(content: GeneratedContent[]): {
  totalPages: number;
  totalWords: number;
  totalReadTime: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};

  for (const item of content) {
    byType[item.type] = (byType[item.type] || 0) + 1;
  }

  return {
    totalPages: content.length,
    totalWords: content.reduce((sum, c) => sum + c.metadata.wordCount, 0),
    totalReadTime: content.reduce((sum, c) => sum + c.metadata.readTime, 0),
    byType,
  };
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

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function getHotelTypeHebrew(type: string): string {
  const map: Record<string, string> = {
    'luxury': 'יוקרתי',
    'boutique': 'בוטיק',
    'business': 'עסקי',
    'resort': 'ריזורט',
    'family': 'משפחתי',
    'budget': 'תקציבי',
  };
  return map[type] || type;
}

function getCategoryHebrew(category: string): string {
  const map: Record<string, string> = {
    'fine_dining': 'יוקרתית',
    'local': 'מקומית',
    'international': 'בינלאומית',
    'casual': 'קז\'ואלית',
    'kosher': 'כשרה',
    'cafe': 'בית קפה',
  };
  return map[category] || category;
}

function getAttractionCategoryHebrew(category: string): string {
  const map: Record<string, string> = {
    'iconic': 'אטרקציה אייקונית',
    'culture': 'אתר תרבות',
    'nature': 'אתר טבע',
    'shopping': 'מרכז קניות',
    'nightlife': 'מקום בילויים',
    'family': 'אטרקציה משפחתית',
    'unique': 'חוויה ייחודית',
  };
  return map[category] || category;
}

function inferEntityType(entity: HotelData | RestaurantData | AttractionData): string {
  if ('stars' in entity) return 'מלונות';
  if ('cuisine' in entity) return 'מסעדות';
  return 'אטרקציות';
}

function findEntities(
  names: string[],
  research: ParsedResearch
): Array<HotelData | RestaurantData | AttractionData> {
  const entities: Array<HotelData | RestaurantData | AttractionData> = [];

  for (const name of names) {
    const hotel = research.hotels.find(h => h.name === name);
    if (hotel) { entities.push(hotel); continue; }

    const restaurant = research.restaurants.find(r => r.name === name);
    if (restaurant) { entities.push(restaurant); continue; }

    const attraction = research.attractions.find(a => a.name === name);
    if (attraction) { entities.push(attraction); }
  }

  return entities;
}

// Content generation helpers
function generateHotelOverview(hotel: HotelData, destination: string): string {
  return `${hotel.name} הוא מלון ${hotel.stars} כוכבים ${getHotelTypeHebrew(hotel.type)} ב${hotel.area || destination}. ${hotel.mainAdvantage ? `היתרון העיקרי של המלון: ${hotel.mainAdvantage}.` : ''} המלון מתאים במיוחד ל${hotel.targetAudience.join(' ול')}.`;
}

function generateLocationSection(area: string, destination: string): string {
  if (!area) return `המלון ממוקם ב${destination} במיקום נוח.`;
  return `המלון ממוקם ב${area}, ${destination}. מיקום זה מאפשר גישה נוחה לאטרקציות המרכזיות של העיר.`;
}

function generateAmenitiesSection(hotel: HotelData): string {
  const defaultAmenities = ['WiFi חינם', 'חניה', 'מיזוג אוויר', 'שירות חדרים'];
  const amenities = hotel.amenities || defaultAmenities;
  return amenities.map(a => `- ${a}`).join('\n');
}

function generateAudienceSection(audiences: string[], type: string): string {
  return `${type} זה מתאים במיוחד ל:\n${audiences.map(a => `- ${a}`).join('\n')}`;
}

function generateHotelTips(hotel: HotelData): string {
  return `- מומלץ להזמין מראש, במיוחד בעונת השיא
- בדקו אם ארוחת בוקר כלולה במחיר
- ${hotel.stars >= 5 ? 'שאלו על שדרוגים זמינים בעת הצ\'ק-אין' : 'השוו מחירים באתרים שונים'}`;
}

function generateRestaurantOverview(restaurant: RestaurantData, destination: string): string {
  return `${restaurant.name} היא מסעדת ${restaurant.cuisine} ${getCategoryHebrew(restaurant.category)} ב${restaurant.area || destination}. ${restaurant.whyGood}`;
}

function generateMenuRecommendations(restaurant: RestaurantData): string {
  const specialties = restaurant.specialties || [`מנות ${restaurant.cuisine} מסורתיות`];
  return specialties.map(s => `- ${s}`).join('\n');
}

function generateRestaurantPracticalInfo(restaurant: RestaurantData): string {
  return `- **מטבח:** ${restaurant.cuisine}
- **טווח מחירים:** ${restaurant.priceRange}
- **מיקום:** ${restaurant.area || 'מרכז העיר'}
- **סגנון:** ${getCategoryHebrew(restaurant.category)}`;
}

function generateAttractionOverview(attraction: AttractionData, destination: string): string {
  return `${attraction.name} הוא ${getAttractionCategoryHebrew(attraction.category)} ב${destination}. מתאים ל${attraction.targetAudience.join(' ול')}.`;
}

function generateVisitInfo(attraction: AttractionData): string {
  return `- **משך ביקור מומלץ:** ${attraction.duration}
- **כניסה:** ${attraction.isFree ? 'חינם' : attraction.price || 'בתשלום'}
${attraction.bestTime ? `- **זמן מומלץ לביקור:** ${attraction.bestTime}` : ''}`;
}

function generateAttractionTips(attraction: AttractionData): string {
  const tips = [
    '- הגיעו מוקדם כדי להימנע מתורים',
    `- הקציבו ${attraction.duration} לביקור`,
  ];
  if (attraction.isFree) tips.push('- כניסה חופשית - נצלו את זה!');
  return tips.join('\n');
}

function generateEntitySummary(entity: HotelData | RestaurantData | AttractionData, type: string): string {
  if ('stars' in entity) {
    return `${entity.name} הוא מלון ${entity.stars} כוכבים ${getHotelTypeHebrew(entity.type)}. ${entity.mainAdvantage || ''} מתאים ל${entity.targetAudience.join(', ')}.`;
  }
  if ('cuisine' in entity) {
    return `${entity.name} - מסעדת ${entity.cuisine}. ${entity.whyGood || ''} טווח מחירים: ${entity.priceRange}.`;
  }
  return `${entity.name} - ${(entity as AttractionData).description || getAttractionCategoryHebrew((entity as AttractionData).category)}. משך ביקור: ${(entity as AttractionData).duration}.`;
}

function generateDayItinerary(day: number, attractions: AttractionData[], destination: string): string {
  const parts = [`**יום ${day} ב${destination}**\n`];

  const timeSlots = ['בוקר', 'צהריים', 'אחר הצהריים', 'ערב'];

  attractions.forEach((attr, i) => {
    const timeSlot = timeSlots[Math.min(i, timeSlots.length - 1)];
    parts.push(`**${timeSlot}:** ${attr.name} - ${attr.description || getAttractionCategoryHebrew(attr.category)} (${attr.duration})`);
  });

  return parts.join('\n\n');
}

function generateItineraryTips(days: number, destination: string): string {
  return `- התחילו כל יום מוקדם כדי לנצל את הזמן
- השאירו גמישות בלוח הזמנים
- ${days >= 3 ? 'הקדישו יום אחד לסיורים מחוץ לעיר' : 'התמקדו באטרקציות המרכזיות'}
- בדקו שעות פתיחה מראש`;
}

function generateNeighborhoodHotels(hotels: HotelData[], neighborhood: string): string {
  return hotels.slice(0, 5).map(h =>
    `- **${h.name}** - מלון ${h.stars} כוכבים ${getHotelTypeHebrew(h.type)}`
  ).join('\n');
}

function generateNeighborhoodRestaurants(restaurants: RestaurantData[], neighborhood: string): string {
  return restaurants.slice(0, 5).map(r =>
    `- **${r.name}** - ${r.cuisine} (${r.priceRange})`
  ).join('\n');
}

function generateNeighborhoodAttractions(attractions: AttractionData[], neighborhood: string): string {
  return attractions.slice(0, 5).map(a =>
    `- **${a.name}** - ${getAttractionCategoryHebrew(a.category)}`
  ).join('\n');
}

// Schema generators for structured data
function generateHotelSchema(hotel: HotelData, destination: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    address: { '@type': 'PostalAddress', addressLocality: destination },
    starRating: { '@type': 'Rating', ratingValue: hotel.stars },
  };
}

function generateRestaurantSchema(restaurant: RestaurantData, destination: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    servesCuisine: restaurant.cuisine,
    priceRange: restaurant.priceRange,
    address: { '@type': 'PostalAddress', addressLocality: destination },
  };
}

function generateAttractionSchema(attraction: AttractionData, destination: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: attraction.name,
    description: attraction.description,
    isAccessibleForFree: attraction.isFree,
    address: { '@type': 'PostalAddress', addressLocality: destination },
  };
}

function generateListSchema(title: string, entities: Array<{ name: string }>, destination: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    itemListElement: entities.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: e.name,
    })),
  };
}

function generateItinerarySchema(title: string, days: number, attractions: AttractionData[], destination: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: title,
    touristType: 'Traveler',
    itinerary: {
      '@type': 'ItemList',
      numberOfItems: attractions.length,
    },
  };
}

function generateNeighborhoodSchema(neighborhood: NeighborhoodData, destination: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: neighborhood.name,
    description: neighborhood.description,
    address: { '@type': 'PostalAddress', addressLocality: destination },
  };
}
