/**
 * Octopus Engine - Bulk Content Generator
 * Generates MAXIMUM content from research documents
 * Creates all possible content combinations and variations
 */

import { getAllUnifiedProviders } from '../ai/providers';
import { log } from '../lib/logger';
import type { ParsedResearch, HotelData, AttractionData, RestaurantData, NeighborhoodData } from './research-parser';
import type { TaggedEntity } from './auto-tagger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Bulk Generator] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Bulk Generator] ${msg}`, undefined, data),
};

// ============================================================================
// Types
// ============================================================================

export interface ContentPlan {
  destination: string;
  totalPages: number;
  entityPages: EntityPagePlan[];
  articlePages: ArticlePagePlan[];
  listingPages: ListingPagePlan[];
  guidePages: GuidePagePlan[];
  comparisonPages: ComparisonPagePlan[];
}

export interface EntityPagePlan {
  type: 'hotel' | 'restaurant' | 'attraction' | 'neighborhood';
  name: string;
  slug: string;
  priority: 'high' | 'medium' | 'low';
  urlPath: string;
  relatedPages: string[];
}

export interface ArticlePagePlan {
  type: ArticleType;
  title: string;
  slug: string;
  priority: 'high' | 'medium' | 'low';
  entities: string[];
  targetAudience?: string;
  urlPath: string;
}

export interface ListingPagePlan {
  type: 'category' | 'area' | 'audience' | 'price';
  title: string;
  slug: string;
  filter: { key: string; value: string };
  entityCount: number;
  urlPath: string;
}

export interface GuidePagePlan {
  type: 'destination' | 'neighborhood' | 'activity' | 'practical';
  title: string;
  slug: string;
  sections: string[];
  urlPath: string;
}

export interface ComparisonPagePlan {
  title: string;
  slug: string;
  entities: [string, string];
  entityType: string;
  urlPath: string;
}

export type ArticleType =
  | 'top-list'           // Top 10 Hotels in Dubai
  | 'best-for'           // Best Hotels for Families in Dubai
  | 'area-guide'         // Dubai Marina Complete Guide
  | 'budget-guide'       // Budget Travel Guide to Dubai
  | 'luxury-guide'       // Luxury Dubai Experience
  | 'itinerary'          // 3 Days in Dubai
  | 'seasonal'           // Dubai in Summer
  | 'first-time'         // First Time in Dubai
  | 'local-tips'         // Local Tips for Dubai
  | 'food-guide'         // Where to Eat in Dubai
  | 'nightlife-guide'    // Dubai Nightlife Guide
  | 'shopping-guide'     // Shopping in Dubai
  | 'free-things'        // Free Things to Do in Dubai
  | 'hidden-gems'        // Hidden Gems in Dubai
  | 'day-trips'          // Day Trips from Dubai
  | 'romantic'           // Romantic Dubai
  | 'adventure'          // Adventure Activities in Dubai
  | 'cultural';          // Cultural Experiences in Dubai

// ============================================================================
// Content Plan Generator
// ============================================================================

/**
 * Generate a complete content plan from research
 */
export function generateContentPlan(
  research: ParsedResearch,
  taggedEntities: TaggedEntity[]
): ContentPlan {
  const destination = research.destination;
  const destSlug = slugify(destination);

  const entityPages = generateEntityPagePlans(research, destSlug);
  const articlePages = generateArticlePagePlans(research, taggedEntities, destSlug);
  const listingPages = generateListingPagePlans(research, taggedEntities, destSlug);
  const guidePages = generateGuidePagePlans(research, destSlug);
  const comparisonPages = generateComparisonPagePlans(research, destSlug);

  const totalPages = entityPages.length + articlePages.length +
                     listingPages.length + guidePages.length + comparisonPages.length;

  logger.info('Content plan generated', {
    destination,
    entityPages: entityPages.length,
    articlePages: articlePages.length,
    listingPages: listingPages.length,
    guidePages: guidePages.length,
    comparisonPages: comparisonPages.length,
    totalPages,
  });

  return {
    destination,
    totalPages,
    entityPages,
    articlePages,
    listingPages,
    guidePages,
    comparisonPages,
  };
}

// ============================================================================
// Entity Page Plans
// ============================================================================

function generateEntityPagePlans(research: ParsedResearch, destSlug: string): EntityPagePlan[] {
  const plans: EntityPagePlan[] = [];

  // Hotel pages
  for (const hotel of research.hotels) {
    const slug = slugify(hotel.name);
    plans.push({
      type: 'hotel',
      name: hotel.name,
      slug,
      priority: hotel.stars >= 5 ? 'high' : hotel.stars >= 4 ? 'medium' : 'low',
      urlPath: `/${destSlug}/hotels/${slug}`,
      relatedPages: [
        `/${destSlug}/hotels`,
        hotel.area ? `/${destSlug}/neighborhoods/${slugify(hotel.area)}` : '',
      ].filter(Boolean),
    });
  }

  // Restaurant pages
  for (const restaurant of research.restaurants) {
    const slug = slugify(restaurant.name);
    plans.push({
      type: 'restaurant',
      name: restaurant.name,
      slug,
      priority: restaurant.category === 'fine_dining' ? 'high' : 'medium',
      urlPath: `/${destSlug}/restaurants/${slug}`,
      relatedPages: [
        `/${destSlug}/restaurants`,
        restaurant.area ? `/${destSlug}/neighborhoods/${slugify(restaurant.area)}` : '',
      ].filter(Boolean),
    });
  }

  // Attraction pages
  for (const attraction of research.attractions) {
    const slug = slugify(attraction.name);
    plans.push({
      type: 'attraction',
      name: attraction.name,
      slug,
      priority: attraction.category === 'iconic' ? 'high' : 'medium',
      urlPath: `/${destSlug}/attractions/${slug}`,
      relatedPages: [`/${destSlug}/attractions`],
    });
  }

  // Neighborhood pages
  for (const neighborhood of research.neighborhoods) {
    const slug = slugify(neighborhood.name);
    plans.push({
      type: 'neighborhood',
      name: neighborhood.name,
      slug,
      priority: (neighborhood.hotelCount || 0) > 5 ? 'high' : 'medium',
      urlPath: `/${destSlug}/neighborhoods/${slug}`,
      relatedPages: [`/${destSlug}/neighborhoods`],
    });
  }

  return plans;
}

// ============================================================================
// Article Page Plans
// ============================================================================

function generateArticlePagePlans(
  research: ParsedResearch,
  taggedEntities: TaggedEntity[],
  destSlug: string
): ArticlePagePlan[] {
  const plans: ArticlePagePlan[] = [];
  const dest = research.destination;

  // === TOP LISTS ===

  // Top hotels
  if (research.hotels.length >= 5) {
    plans.push({
      type: 'top-list',
      title: `${Math.min(10, research.hotels.length)} המלונות הטובים ביותר ב${dest}`,
      slug: `top-hotels-${destSlug}`,
      priority: 'high',
      entities: research.hotels.slice(0, 10).map(h => h.name),
      urlPath: `/${destSlug}/guides/top-hotels`,
    });

    // Top by stars
    const fiveStarHotels = research.hotels.filter(h => h.stars >= 5);
    if (fiveStarHotels.length >= 3) {
      plans.push({
        type: 'top-list',
        title: `מלונות 5 כוכבים ב${dest}`,
        slug: `5-star-hotels-${destSlug}`,
        priority: 'high',
        entities: fiveStarHotels.map(h => h.name),
        urlPath: `/${destSlug}/hotels/5-star`,
      });
    }
  }

  // Top restaurants
  if (research.restaurants.length >= 5) {
    plans.push({
      type: 'top-list',
      title: `${Math.min(10, research.restaurants.length)} המסעדות הטובות ביותר ב${dest}`,
      slug: `top-restaurants-${destSlug}`,
      priority: 'high',
      entities: research.restaurants.slice(0, 10).map(r => r.name),
      urlPath: `/${destSlug}/guides/top-restaurants`,
    });
  }

  // Top attractions
  if (research.attractions.length >= 5) {
    const iconicAttractions = research.attractions.filter(a => a.category === 'iconic');
    plans.push({
      type: 'top-list',
      title: `חובה לראות ב${dest}`,
      slug: `must-see-${destSlug}`,
      priority: 'high',
      entities: iconicAttractions.length > 0
        ? iconicAttractions.map(a => a.name)
        : research.attractions.slice(0, 10).map(a => a.name),
      urlPath: `/${destSlug}/guides/must-see`,
    });
  }

  // === BEST FOR (by audience) ===

  const audiences = ['families', 'couples', 'business', 'luxury', 'backpackers'];
  for (const audience of audiences) {
    const audienceHotels = research.hotels.filter(h =>
      h.targetAudience.some(t => t.toLowerCase().includes(getAudienceKeyword(audience)))
    );

    if (audienceHotels.length >= 3) {
      plans.push({
        type: 'best-for',
        title: `מלונות מומלצים ל${getAudienceHebrew(audience)} ב${dest}`,
        slug: `best-hotels-${audience}-${destSlug}`,
        priority: 'medium',
        entities: audienceHotels.map(h => h.name),
        targetAudience: audience,
        urlPath: `/${destSlug}/hotels/${audience}`,
      });
    }
  }

  // === AREA GUIDES ===

  for (const neighborhood of research.neighborhoods) {
    const areaHotels = research.hotels.filter(h => h.area === neighborhood.name);
    const areaRestaurants = research.restaurants.filter(r => r.area === neighborhood.name);

    if (areaHotels.length >= 2 || areaRestaurants.length >= 2) {
      plans.push({
        type: 'area-guide',
        title: `מדריך שכונת ${neighborhood.name} ב${dest}`,
        slug: `${slugify(neighborhood.name)}-guide`,
        priority: areaHotels.length >= 5 ? 'high' : 'medium',
        entities: [...areaHotels.map(h => h.name), ...areaRestaurants.map(r => r.name)],
        urlPath: `/${destSlug}/neighborhoods/${slugify(neighborhood.name)}/guide`,
      });
    }
  }

  // === BUDGET & LUXURY GUIDES ===

  plans.push({
    type: 'budget-guide',
    title: `${dest} בתקציב - מדריך לחיסכון`,
    slug: `budget-${destSlug}`,
    priority: 'high',
    entities: research.freeActivities.map(a => a.name),
    urlPath: `/${destSlug}/guides/budget`,
  });

  const luxuryHotels = research.hotels.filter(h => h.type === 'luxury' || h.stars >= 5);
  const fineDining = research.restaurants.filter(r => r.category === 'fine_dining');
  if (luxuryHotels.length >= 2 || fineDining.length >= 2) {
    plans.push({
      type: 'luxury-guide',
      title: `חוויית יוקרה ב${dest}`,
      slug: `luxury-${destSlug}`,
      priority: 'high',
      entities: [...luxuryHotels.map(h => h.name), ...fineDining.map(r => r.name)],
      urlPath: `/${destSlug}/guides/luxury`,
    });
  }

  // === ITINERARIES ===

  for (const days of [1, 2, 3, 5, 7]) {
    if (research.attractions.length >= days * 2) {
      plans.push({
        type: 'itinerary',
        title: `${days} ימים ב${dest} - מסלול מומלץ`,
        slug: `${days}-days-${destSlug}`,
        priority: days === 3 ? 'high' : 'medium',
        entities: research.attractions.slice(0, days * 3).map(a => a.name),
        urlPath: `/${destSlug}/itineraries/${days}-days`,
      });
    }
  }

  // === THEMATIC GUIDES ===

  // Free things
  if (research.freeActivities.length >= 3) {
    plans.push({
      type: 'free-things',
      title: `דברים לעשות בחינם ב${dest}`,
      slug: `free-things-${destSlug}`,
      priority: 'high',
      entities: research.freeActivities.map(a => a.name),
      urlPath: `/${destSlug}/guides/free-activities`,
    });
  }

  // Food guide
  plans.push({
    type: 'food-guide',
    title: `איפה לאכול ב${dest} - מדריך קולינרי`,
    slug: `food-guide-${destSlug}`,
    priority: 'high',
    entities: research.restaurants.map(r => r.name),
    urlPath: `/${destSlug}/guides/food`,
  });

  // Nightlife
  const nightlifeAttractions = research.attractions.filter(a => a.category === 'nightlife');
  if (nightlifeAttractions.length >= 2) {
    plans.push({
      type: 'nightlife-guide',
      title: `חיי הלילה ב${dest}`,
      slug: `nightlife-${destSlug}`,
      priority: 'medium',
      entities: nightlifeAttractions.map(a => a.name),
      urlPath: `/${destSlug}/guides/nightlife`,
    });
  }

  // Shopping
  const shoppingAttractions = research.attractions.filter(a => a.category === 'shopping');
  if (shoppingAttractions.length >= 2) {
    plans.push({
      type: 'shopping-guide',
      title: `קניות ב${dest} - המדריך המלא`,
      slug: `shopping-${destSlug}`,
      priority: 'medium',
      entities: shoppingAttractions.map(a => a.name),
      urlPath: `/${destSlug}/guides/shopping`,
    });
  }

  // Family guide
  const familyAttractions = research.attractions.filter(a => a.category === 'family');
  const familyHotels = research.hotels.filter(h =>
    h.targetAudience.some(t => /משפח|family/i.test(t))
  );
  if (familyAttractions.length >= 2 || familyHotels.length >= 2) {
    plans.push({
      type: 'best-for',
      title: `${dest} עם ילדים - מדריך למשפחות`,
      slug: `family-guide-${destSlug}`,
      priority: 'high',
      entities: [...familyAttractions.map(a => a.name), ...familyHotels.map(h => h.name)],
      targetAudience: 'families',
      urlPath: `/${destSlug}/guides/family`,
    });
  }

  // Romantic guide
  plans.push({
    type: 'romantic',
    title: `${dest} הרומנטית - לזוגות`,
    slug: `romantic-${destSlug}`,
    priority: 'medium',
    entities: research.hotels.filter(h =>
      h.targetAudience.some(t => /זוג|רומנט|couple/i.test(t))
    ).map(h => h.name),
    targetAudience: 'couples',
    urlPath: `/${destSlug}/guides/romantic`,
  });

  // First time guide
  plans.push({
    type: 'first-time',
    title: `פעם ראשונה ב${dest} - כל מה שצריך לדעת`,
    slug: `first-time-${destSlug}`,
    priority: 'high',
    entities: research.attractions.filter(a => a.category === 'iconic').map(a => a.name),
    urlPath: `/${destSlug}/guides/first-time`,
  });

  // Local tips
  if (research.localLaws.length >= 3) {
    plans.push({
      type: 'local-tips',
      title: `טיפים מקומיים ל${dest} - מה שהתיירים לא יודעים`,
      slug: `local-tips-${destSlug}`,
      priority: 'high',
      entities: [],
      urlPath: `/${destSlug}/guides/local-tips`,
    });
  }

  // Cultural guide
  const culturalAttractions = research.attractions.filter(a => a.category === 'culture');
  if (culturalAttractions.length >= 3) {
    plans.push({
      type: 'cultural',
      title: `תרבות והיסטוריה ב${dest}`,
      slug: `culture-${destSlug}`,
      priority: 'medium',
      entities: culturalAttractions.map(a => a.name),
      urlPath: `/${destSlug}/guides/culture`,
    });
  }

  return plans;
}

// ============================================================================
// Listing Page Plans
// ============================================================================

function generateListingPagePlans(
  research: ParsedResearch,
  taggedEntities: TaggedEntity[],
  destSlug: string
): ListingPagePlan[] {
  const plans: ListingPagePlan[] = [];
  const dest = research.destination;

  // Main category listings
  plans.push({
    type: 'category',
    title: `כל המלונות ב${dest}`,
    slug: 'all-hotels',
    filter: { key: 'type', value: 'hotel' },
    entityCount: research.hotels.length,
    urlPath: `/${destSlug}/hotels`,
  });

  plans.push({
    type: 'category',
    title: `כל המסעדות ב${dest}`,
    slug: 'all-restaurants',
    filter: { key: 'type', value: 'restaurant' },
    entityCount: research.restaurants.length,
    urlPath: `/${destSlug}/restaurants`,
  });

  plans.push({
    type: 'category',
    title: `כל האטרקציות ב${dest}`,
    slug: 'all-attractions',
    filter: { key: 'type', value: 'attraction' },
    entityCount: research.attractions.length,
    urlPath: `/${destSlug}/attractions`,
  });

  // Area listings
  for (const neighborhood of research.neighborhoods) {
    const areaEntities = taggedEntities.filter(e =>
      e.tags.some(t => t.type === 'area' && t.value === neighborhood.name)
    );

    if (areaEntities.length >= 2) {
      plans.push({
        type: 'area',
        title: `${neighborhood.name} - מלונות, מסעדות ואטרקציות`,
        slug: slugify(neighborhood.name),
        filter: { key: 'area', value: neighborhood.name },
        entityCount: areaEntities.length,
        urlPath: `/${destSlug}/neighborhoods/${slugify(neighborhood.name)}`,
      });
    }
  }

  // Price range listings
  plans.push({
    type: 'price',
    title: `מלונות יוקרה ב${dest}`,
    slug: 'luxury-hotels',
    filter: { key: 'price', value: 'luxury' },
    entityCount: research.hotels.filter(h => h.type === 'luxury').length,
    urlPath: `/${destSlug}/hotels/luxury`,
  });

  plans.push({
    type: 'price',
    title: `מלונות במחיר סביר ב${dest}`,
    slug: 'budget-hotels',
    filter: { key: 'price', value: 'budget' },
    entityCount: research.hotels.filter(h => h.type === 'budget').length,
    urlPath: `/${destSlug}/hotels/budget`,
  });

  // Restaurant category listings
  const restaurantCategories = ['fine_dining', 'local', 'kosher', 'casual'];
  for (const cat of restaurantCategories) {
    const count = research.restaurants.filter(r => r.category === cat).length;
    if (count >= 2) {
      plans.push({
        type: 'category',
        title: `${getCategoryHebrew(cat)} ב${dest}`,
        slug: `${cat.replace('_', '-')}-restaurants`,
        filter: { key: 'category', value: cat },
        entityCount: count,
        urlPath: `/${destSlug}/restaurants/${cat.replace('_', '-')}`,
      });
    }
  }

  return plans;
}

// ============================================================================
// Guide Page Plans
// ============================================================================

function generateGuidePagePlans(research: ParsedResearch, destSlug: string): GuidePagePlan[] {
  const plans: GuidePagePlan[] = [];
  const dest = research.destination;

  // Main destination guide
  plans.push({
    type: 'destination',
    title: `המדריך המלא ל${dest}`,
    slug: `complete-guide-${destSlug}`,
    sections: [
      'overview',
      'best-time-to-visit',
      'neighborhoods',
      'getting-around',
      'where-to-stay',
      'where-to-eat',
      'what-to-do',
      'local-tips',
      'budget',
    ],
    urlPath: `/${destSlug}/guide`,
  });

  // Practical guide
  plans.push({
    type: 'practical',
    title: `מידע פרקטי על ${dest}`,
    slug: `practical-info-${destSlug}`,
    sections: [
      'visa',
      'currency',
      'language',
      'safety',
      'transportation',
      'electricity',
      'health',
      'emergency',
    ],
    urlPath: `/${destSlug}/guides/practical-info`,
  });

  // Neighborhood guides
  for (const neighborhood of research.neighborhoods) {
    if ((neighborhood.hotelCount || 0) >= 2 || (neighborhood.restaurantCount || 0) >= 2) {
      plans.push({
        type: 'neighborhood',
        title: `מדריך ל${neighborhood.name}`,
        slug: `${slugify(neighborhood.name)}-guide`,
        sections: ['overview', 'hotels', 'restaurants', 'attractions', 'getting-there'],
        urlPath: `/${destSlug}/neighborhoods/${slugify(neighborhood.name)}/guide`,
      });
    }
  }

  return plans;
}

// ============================================================================
// Comparison Page Plans
// ============================================================================

function generateComparisonPagePlans(research: ParsedResearch, destSlug: string): ComparisonPagePlan[] {
  const plans: ComparisonPagePlan[] = [];
  const dest = research.destination;

  // Hotel comparisons (top rated vs top rated)
  const topHotels = research.hotels
    .filter(h => h.stars >= 4)
    .slice(0, 6);

  for (let i = 0; i < topHotels.length - 1; i += 2) {
    const hotel1 = topHotels[i];
    const hotel2 = topHotels[i + 1];

    plans.push({
      title: `${hotel1.name} מול ${hotel2.name} - השוואה`,
      slug: `${slugify(hotel1.name)}-vs-${slugify(hotel2.name)}`,
      entities: [hotel1.name, hotel2.name],
      entityType: 'hotel',
      urlPath: `/${destSlug}/compare/hotels/${slugify(hotel1.name)}-vs-${slugify(hotel2.name)}`,
    });
  }

  // Area comparisons
  const topNeighborhoods = research.neighborhoods
    .filter(n => (n.hotelCount || 0) >= 3)
    .slice(0, 4);

  for (let i = 0; i < topNeighborhoods.length - 1; i += 2) {
    const n1 = topNeighborhoods[i];
    const n2 = topNeighborhoods[i + 1];

    plans.push({
      title: `${n1.name} או ${n2.name} - איפה לישון ב${dest}?`,
      slug: `${slugify(n1.name)}-vs-${slugify(n2.name)}`,
      entities: [n1.name, n2.name],
      entityType: 'neighborhood',
      urlPath: `/${destSlug}/compare/neighborhoods/${slugify(n1.name)}-vs-${slugify(n2.name)}`,
    });
  }

  return plans;
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

function getAudienceKeyword(audience: string): string {
  const map: Record<string, string> = {
    'families': 'משפח',
    'couples': 'זוג',
    'business': 'עסק',
    'luxury': 'יוקר',
    'backpackers': 'תרמיל',
  };
  return map[audience] || audience;
}

function getAudienceHebrew(audience: string): string {
  const map: Record<string, string> = {
    'families': 'משפחות',
    'couples': 'זוגות',
    'business': 'אנשי עסקים',
    'luxury': 'חובבי יוקרה',
    'backpackers': 'תרמילאים',
  };
  return map[audience] || audience;
}

function getCategoryHebrew(category: string): string {
  const map: Record<string, string> = {
    'fine_dining': 'מסעדות יוקרה',
    'local': 'אוכל מקומי',
    'kosher': 'מסעדות כשרות',
    'casual': 'מסעדות קז\'ואל',
    'international': 'מטבח בינלאומי',
  };
  return map[category] || category;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get content plan statistics
 */
export function getContentPlanStats(plan: ContentPlan): {
  totalPages: number;
  breakdown: Record<string, number>;
  estimatedWordCount: number;
  topPriorityPages: number;
} {
  return {
    totalPages: plan.totalPages,
    breakdown: {
      entityPages: plan.entityPages.length,
      articlePages: plan.articlePages.length,
      listingPages: plan.listingPages.length,
      guidePages: plan.guidePages.length,
      comparisonPages: plan.comparisonPages.length,
    },
    estimatedWordCount: estimateWordCount(plan),
    topPriorityPages: [
      ...plan.entityPages.filter(p => p.priority === 'high'),
      ...plan.articlePages.filter(p => p.priority === 'high'),
    ].length,
  };
}

function estimateWordCount(plan: ContentPlan): number {
  // Rough estimates per page type
  const entityWords = plan.entityPages.length * 800;
  const articleWords = plan.articlePages.length * 1500;
  const listingWords = plan.listingPages.length * 300;
  const guideWords = plan.guidePages.length * 2500;
  const comparisonWords = plan.comparisonPages.length * 1200;

  return entityWords + articleWords + listingWords + guideWords + comparisonWords;
}

/**
 * Export content plan as URL list for sitemap
 */
export function exportSitemap(plan: ContentPlan, baseUrl: string): string[] {
  const urls: string[] = [];

  for (const page of plan.entityPages) {
    urls.push(`${baseUrl}${page.urlPath}`);
  }
  for (const page of plan.articlePages) {
    urls.push(`${baseUrl}${page.urlPath}`);
  }
  for (const page of plan.listingPages) {
    urls.push(`${baseUrl}${page.urlPath}`);
  }
  for (const page of plan.guidePages) {
    urls.push(`${baseUrl}${page.urlPath}`);
  }
  for (const page of plan.comparisonPages) {
    urls.push(`${baseUrl}${page.urlPath}`);
  }

  return urls;
}
