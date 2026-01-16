/**
 * Content Multiplier - Generates ALL possible content from extracted entities
 *
 * Takes entities extracted from research and multiplies them into:
 * - Entity pages (hotels, restaurants, attractions)
 * - Comparison articles (A vs B)
 * - Ranking articles (Top 10, Best X)
 * - Area/neighborhood guides
 * - FAQ pages
 * - "Is X Worth It?" articles
 * - Seasonal content
 * - Budget guides
 * - Monthly guides
 * - Audience-specific guides
 * - Category guides (temples, nightlife, street food, etc.)
 * - And more...
 *
 * Two tiers:
 * - TIER 1 (Immediate): Core pages needed for site launch
 * - TIER 2 (Drafts): Extended content for ongoing publication
 *
 * Goal: 150+ content tasks from 50 entities
 */

import type { ExtractedEntity, EntityType } from './entity-extractor';

// ============================================================================
// TYPES
// ============================================================================

export type ContentPriority = 'critical' | 'high' | 'medium' | 'low';
export type PublishTier = 'immediate' | 'draft';

export type ContentType =
  | 'entity_page'
  | 'comparison'
  | 'ranking'
  | 'area_guide'
  | 'category_roundup'
  | 'faq_page'
  | 'worth_it'
  | 'itinerary'
  | 'budget_guide'
  | 'seasonal'
  | 'hidden_gems'
  | 'vs_article'
  | 'tips_article'
  | 'neighborhood_update'
  | 'destination_guide'
  | 'temple_guide'
  | 'street_food_guide'
  | 'nightlife_guide'
  | 'shopping_guide'
  | 'transportation_guide'
  | 'tourist_tips'
  | 'mistakes_article'
  | 'laws_article'
  | 'photo_spots'
  | 'free_activities'
  | 'monthly_guide'
  | 'audience_guide'
  | 'cuisine_guide'
  | 'michelin_guide';

export interface ContentTask {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  priority: ContentPriority;
  tier: PublishTier;

  entities: string[];
  primaryEntity?: string;

  destination: string;
  area?: string;

  templateId: string;
  variables: Record<string, unknown>;
  estimatedWords: number;

  dependsOn: string[];

  status: 'pending' | 'generating' | 'review' | 'published';
  createdAt: Date;
}

export interface MultiplicationResult {
  tasks: ContentTask[];
  stats: {
    total: number;
    byType: Record<ContentType, number>;
    byTier: { immediate: number; draft: number };
    byPriority: Record<ContentPriority, number>;
    estimatedTotalWords: number;
  };
}

export interface MultiplicationConfig {
  maxComparisons?: number;
  maxRankings?: number;
  maxMonthlyGuides?: number;
  maxAudienceGuides?: number;
  generateSeasonalContent?: boolean;
  generateBudgetGuides?: boolean;
  generateHiddenGems?: boolean;
  generateMonthlyGuides?: boolean;
  generateAudienceGuides?: boolean;
  generateCategoryGuides?: boolean;
  prioritizeByType?: EntityType[];
}

const DEFAULT_CONFIG: MultiplicationConfig = {
  maxComparisons: Infinity,
  maxRankings: Infinity,
  maxMonthlyGuides: 12,
  maxAudienceGuides: 6,
  generateSeasonalContent: true,
  generateBudgetGuides: true,
  generateHiddenGems: true,
  generateMonthlyGuides: true,
  generateAudienceGuides: true,
  generateCategoryGuides: true,
};

// ============================================================================
// CONTENT MULTIPLICATION RULES
// ============================================================================

const ENTITY_CONTENT_RULES: Record<EntityType, {
  immediate: ContentType[];
  draft: ContentType[];
}> = {
  hotel: {
    immediate: ['entity_page', 'faq_page', 'worth_it'],
    draft: ['tips_article', 'photo_spots', 'comparison'],
  },
  restaurant: {
    immediate: ['entity_page', 'faq_page'],
    draft: ['worth_it', 'tips_article', 'photo_spots'],
  },
  attraction: {
    immediate: ['entity_page', 'faq_page', 'worth_it'],
    draft: ['tips_article', 'photo_spots', 'free_activities'],
  },
  neighborhood: {
    immediate: ['area_guide', 'hidden_gems'],
    draft: ['itinerary', 'photo_spots', 'tips_article', 'free_activities'],
  },
  beach: {
    immediate: ['entity_page', 'faq_page'],
    draft: ['tips_article', 'worth_it', 'photo_spots'],
  },
  mall: {
    immediate: ['entity_page', 'faq_page'],
    draft: ['tips_article', 'photo_spots', 'shopping_guide'],
  },
  museum: {
    immediate: ['entity_page', 'faq_page'],
    draft: ['worth_it', 'tips_article', 'photo_spots'],
  },
  park: {
    immediate: ['entity_page', 'faq_page'],
    draft: ['tips_article', 'photo_spots', 'free_activities'],
  },
  landmark: {
    immediate: ['entity_page', 'faq_page'],
    draft: ['tips_article', 'photo_spots', 'worth_it'],
  },
  transport: {
    immediate: ['entity_page', 'tips_article'],
    draft: ['faq_page', 'transportation_guide'],
  },
  event: {
    immediate: ['entity_page'],
    draft: ['tips_article', 'faq_page'],
  },
  temple: {
    immediate: ['entity_page', 'faq_page'],
    draft: ['tips_article', 'photo_spots', 'worth_it'],
  },
  bar: {
    immediate: ['entity_page'],
    draft: ['tips_article', 'nightlife_guide'],
  },
  rooftop: {
    immediate: ['entity_page', 'photo_spots'],
    draft: ['tips_article', 'worth_it'],
  },
  market: {
    immediate: ['entity_page', 'faq_page'],
    draft: ['tips_article', 'photo_spots', 'shopping_guide'],
  },
  spa: {
    immediate: ['entity_page'],
    draft: ['tips_article', 'worth_it', 'faq_page'],
  },
  cafe: {
    immediate: ['entity_page'],
    draft: ['tips_article', 'photo_spots'],
  },
  club: {
    immediate: ['entity_page'],
    draft: ['tips_article', 'nightlife_guide'],
  },
  transit_hub: {
    immediate: ['entity_page', 'tips_article'],
    draft: ['faq_page', 'transportation_guide'],
  },
  hospital: {
    immediate: ['entity_page', 'faq_page'],
    draft: ['tips_article'],
  },
  festival: {
    immediate: ['entity_page'],
    draft: ['tips_article', 'photo_spots', 'faq_page'],
  },
  shopping_district: {
    immediate: ['entity_page', 'shopping_guide'],
    draft: ['tips_article', 'photo_spots', 'faq_page'],
  },
};

const RANKING_TEMPLATES: Record<EntityType, string[]> = {
  hotel: [
    'Top {n} Hotels in {destination}',
    'Best Hotels in {area} {destination}',
    'Best Luxury Hotels in {destination}',
    'Best Budget Hotels in {destination}',
    'Best Hotels for Families in {destination}',
    'Best Hotels for Couples in {destination}',
    'Best Hotels for Business Travelers in {destination}',
    'Best Boutique Hotels in {destination}',
    'Best Hotels with Pool in {destination}',
    'Best Hotels Near {landmark} in {destination}',
    'Best Hotels for First-Timers in {destination}',
    'Hotels You Can\'t Miss in {destination}',
    'Top Instagram-Worthy Hotels in {destination}',
    'Best Beach Hotels in {destination}',
    'Best Hotels with Spa in {destination}',
  ],
  restaurant: [
    'Top {n} Restaurants in {destination}',
    'Best Restaurants in {area} {destination}',
    'Best Fine Dining Restaurants in {destination}',
    'Best Budget Restaurants in {destination}',
    'Best Restaurants for Families in {destination}',
    'Best Romantic Restaurants in {destination}',
    'Best Street Food Spots in {destination}',
    'Top Rooftop Restaurants in {destination}',
    'Best Brunch Spots in {destination}',
    'Best Restaurants Near {landmark}',
    'Best Restaurants for First-Timers in {destination}',
    'Restaurants You Can\'t Miss in {destination}',
    'Top Instagram Restaurants in {destination}',
    'Best Vegetarian Restaurants in {destination}',
    'Best Seafood Restaurants in {destination}',
  ],
  attraction: [
    'Top {n} Things to Do in {destination}',
    'Best Attractions in {area}',
    'Top Free Attractions in {destination}',
    'Best Family Attractions in {destination}',
    'Best Attractions for Couples in {destination}',
    'Top Instagram Spots in {destination}',
    'Best Indoor Attractions in {destination}',
    'Best Outdoor Attractions in {destination}',
    'Best Attractions Near {landmark}',
    'Best Attractions for First-Timers in {destination}',
    'Attractions You Can\'t Miss in {destination}',
    'Best Budget-Friendly Attractions in {destination}',
    'Best Luxury Experiences in {destination}',
    'Top Cultural Attractions in {destination}',
    'Best Adventure Activities in {destination}',
  ],
  beach: [
    'Top {n} Beaches in {destination}',
    'Best Beaches for Families in {destination}',
    'Best Beaches for Couples in {destination}',
    'Most Beautiful Beaches in {destination}',
    'Best Quiet Beaches in {destination}',
    'Best Party Beaches in {destination}',
    'Best Beaches Near {landmark}',
    'Best Free Beaches in {destination}',
    'Top Instagram Beaches in {destination}',
    'Best Beaches for First-Timers in {destination}',
    'Beaches You Can\'t Miss in {destination}',
    'Best Beaches for Snorkeling in {destination}',
  ],
  mall: [
    'Best Shopping Malls in {destination}',
    'Top {n} Places to Shop in {destination}',
    'Best Luxury Shopping in {destination}',
    'Best Budget Shopping in {destination}',
    'Best Malls for Families in {destination}',
    'Best Malls Near {landmark}',
    'Top Instagram Shopping Spots in {destination}',
    'Shopping You Can\'t Miss in {destination}',
    'Best Malls for First-Timers in {destination}',
    'Best Food Courts in {destination}',
  ],
  museum: [
    'Top {n} Museums in {destination}',
    'Best Museums for Art Lovers in {destination}',
    'Best Museums for Families in {destination}',
    'Best Free Museums in {destination}',
    'Best History Museums in {destination}',
    'Best Science Museums in {destination}',
    'Best Museums Near {landmark}',
    'Top Instagram Museums in {destination}',
    'Museums You Can\'t Miss in {destination}',
    'Best Museums for First-Timers in {destination}',
  ],
  park: [
    'Best Parks in {destination}',
    'Top {n} Nature Spots in {destination}',
    'Best Parks for Families in {destination}',
    'Best Parks for Couples in {destination}',
    'Best Free Parks in {destination}',
    'Best Parks Near {landmark}',
    'Top Instagram Parks in {destination}',
    'Parks You Can\'t Miss in {destination}',
    'Best Parks for First-Timers in {destination}',
    'Best Picnic Spots in {destination}',
  ],
  landmark: [
    'Top {n} Landmarks in {destination}',
    'Must-See Landmarks in {destination}',
    'Best Landmarks for Families in {destination}',
    'Best Landmarks for Couples in {destination}',
    'Best Free Landmarks in {destination}',
    'Top Instagram Landmarks in {destination}',
    'Landmarks You Can\'t Miss in {destination}',
    'Best Landmarks for First-Timers in {destination}',
    'Best Historic Landmarks in {destination}',
    'Best Modern Landmarks in {destination}',
  ],
  neighborhood: [
    'Best Neighborhoods to Stay in {destination}',
    'Top Areas to Visit in {destination}',
    'Best Neighborhoods for Families in {destination}',
    'Best Neighborhoods for Couples in {destination}',
    'Best Budget Neighborhoods in {destination}',
    'Best Luxury Neighborhoods in {destination}',
    'Best Nightlife Areas in {destination}',
    'Best Shopping Areas in {destination}',
    'Best Food Districts in {destination}',
    'Best Neighborhoods for First-Timers in {destination}',
  ],
  transport: [
    'Best Ways to Get Around {destination}',
    'Top Transportation Options in {destination}',
    'Best Budget Transportation in {destination}',
  ],
  event: [
    'Top Events in {destination} This Year',
    'Best Festivals in {destination}',
    'Best Free Events in {destination}',
    'Best Events for Families in {destination}',
    'Best Nightlife Events in {destination}',
  ],
  temple: [
    'Top {n} Temples in {destination}',
    'Best Temples for First-Timers in {destination}',
    'Most Beautiful Temples in {destination}',
    'Best Free Temples in {destination}',
    'Top Instagram Temples in {destination}',
    'Best Temples Near {landmark}',
    'Temples You Can\'t Miss in {destination}',
    'Best Buddhist Temples in {destination}',
    'Best Hindu Temples in {destination}',
    'Best Temples for Sunrise in {destination}',
  ],
  bar: [
    'Top {n} Bars in {destination}',
    'Best Cocktail Bars in {destination}',
    'Best Dive Bars in {destination}',
    'Best Sports Bars in {destination}',
    'Best Bars for Couples in {destination}',
    'Best Bars Near {landmark}',
    'Bars You Can\'t Miss in {destination}',
    'Best Happy Hour Spots in {destination}',
    'Best Live Music Bars in {destination}',
    'Best Bars for First-Timers in {destination}',
  ],
  rooftop: [
    'Top {n} Rooftop Bars in {destination}',
    'Best Rooftop Restaurants in {destination}',
    'Best Rooftop Views in {destination}',
    'Best Rooftops for Couples in {destination}',
    'Best Budget Rooftops in {destination}',
    'Best Rooftops for Sunset in {destination}',
    'Rooftops You Can\'t Miss in {destination}',
    'Best Rooftops Near {landmark}',
    'Top Instagram Rooftops in {destination}',
    'Best Rooftops for First-Timers in {destination}',
  ],
  market: [
    'Top {n} Markets in {destination}',
    'Best Night Markets in {destination}',
    'Best Food Markets in {destination}',
    'Best Flea Markets in {destination}',
    'Best Markets for Souvenirs in {destination}',
    'Best Markets Near {landmark}',
    'Markets You Can\'t Miss in {destination}',
    'Best Budget Markets in {destination}',
    'Top Instagram Markets in {destination}',
    'Best Markets for First-Timers in {destination}',
  ],
  spa: [
    'Top {n} Spas in {destination}',
    'Best Luxury Spas in {destination}',
    'Best Budget Spas in {destination}',
    'Best Spas for Couples in {destination}',
    'Best Thai Massage in {destination}',
    'Best Day Spas in {destination}',
    'Spas You Can\'t Miss in {destination}',
    'Best Spas Near {landmark}',
    'Best Wellness Retreats in {destination}',
  ],
  cafe: [
    'Top {n} Cafes in {destination}',
    'Best Coffee Shops in {destination}',
    'Best Cafes for Working in {destination}',
    'Best Instagram Cafes in {destination}',
    'Best Cafes Near {landmark}',
    'Cafes You Can\'t Miss in {destination}',
    'Best Specialty Coffee in {destination}',
    'Best Cafes for First-Timers in {destination}',
  ],
  club: [
    'Top {n} Nightclubs in {destination}',
    'Best Clubs for Dancing in {destination}',
    'Best EDM Clubs in {destination}',
    'Best Hip Hop Clubs in {destination}',
    'Best Clubs for Couples in {destination}',
    'Best Clubs Near {landmark}',
    'Clubs You Can\'t Miss in {destination}',
    'Best Beach Clubs in {destination}',
    'Best Clubs for First-Timers in {destination}',
  ],
  transit_hub: [
    'Best Transportation Hubs in {destination}',
    'Top Transit Connections in {destination}',
    'Best Airport Facilities in {destination}',
  ],
  hospital: [
    'Top Hospitals for Tourists in {destination}',
    'Best International Hospitals in {destination}',
    'Best Medical Facilities in {destination}',
  ],
  festival: [
    'Top {n} Festivals in {destination}',
    'Best Cultural Festivals in {destination}',
    'Best Music Festivals in {destination}',
    'Best Food Festivals in {destination}',
    'Best Free Festivals in {destination}',
    'Festivals You Can\'t Miss in {destination}',
  ],
  shopping_district: [
    'Top {n} Shopping Areas in {destination}',
    'Best Luxury Shopping Districts in {destination}',
    'Best Budget Shopping Areas in {destination}',
    'Best Shopping Streets in {destination}',
    'Shopping Districts You Can\'t Miss in {destination}',
  ],
};

const ROUNDUP_TEMPLATES = [
  'Best Hotels for {audience}',
  'Best Restaurants for {occasion}',
  'Best {category} Under {budget}',
  'Where to {activity} in {destination}',
  '{destination} on a Budget',
  'Luxury {category} in {destination}',
  '{destination} for First-Timers',
  'Hidden Gems in {area}',
  'Best {category} Near {landmark}',
  '{destination} Weekend Itinerary',
  '3 Days in {destination}',
  '{destination} with Kids',
  'Romantic {destination}',
  'Complete Guide to {destination} Temples',
  'Best Street Food in {destination}',
  'Best Bars and Clubs in {destination}',
  'Top Rooftop Bars in {destination}',
  'Where to Shop in {destination}',
  'Free Things to Do in {destination}',
  'Most Instagrammable Places in {destination}',
  'Getting Around {destination}',
  'Tourist Mistakes to Avoid in {destination}',
  'Important Rules for Tourists in {destination}',
  'Fine Dining in {destination}',
  'Best Markets in {destination}',
  '{destination} Food Tour Guide',
  'Best Coffee Shops in {destination}',
  'Best Spas in {destination}',
  'Best Viewpoints in {destination}',
  '{destination} Nightlife Guide',
  'Best Day Trips from {destination}',
  'Local Experiences in {destination}',
  '{destination} Solo Travel Guide',
  '{destination} Honeymoon Guide',
  'Best Walking Tours in {destination}',
];

// ============================================================================
// MAIN MULTIPLICATION FUNCTION
// ============================================================================

export function multiplyContent(
  entities: ExtractedEntity[],
  destination: string,
  config: MultiplicationConfig = {}
): MultiplicationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const tasks: ContentTask[] = [];
  const now = new Date();

  const byType = groupByType(entities);
  const byArea = groupByArea(entities);

  // =========================================================================
  // TIER 1: IMMEDIATE PUBLISH (Core Content)
  // =========================================================================

  for (const entity of entities) {
    const rules = ENTITY_CONTENT_RULES[entity.type];
    if (rules?.immediate.includes('entity_page')) {
      tasks.push(createEntityPageTask(entity, destination, now));
    }
    if (rules?.immediate.includes('faq_page')) {
      tasks.push(createFAQPageTask(entity, destination, now));
    }
    if (rules?.immediate.includes('area_guide')) {
      tasks.push(createAreaGuideTask(entity, destination, now));
    }
    if (rules?.immediate.includes('worth_it')) {
      tasks.push(createWorthItTask(entity, destination, now));
    }
    if (rules?.immediate.includes('hidden_gems')) {
      tasks.push(createHiddenGemTask(entity, destination, now));
    }
  }

  for (const [area, areaEntities] of Object.entries(byArea)) {
    if (area && area !== 'unknown') {
      tasks.push(createNeighborhoodUpdateTask(area, areaEntities, destination, now));
    }
  }

  const primaryRankings = generatePrimaryRankings(byType, destination, cfg);
  tasks.push(...primaryRankings.map(t => ({ ...t, createdAt: now })));

  const masterGuide = generateDestinationMasterGuide(entities, destination);
  tasks.push(...masterGuide.map(t => ({ ...t, createdAt: now })));

  // =========================================================================
  // TIER 2: DRAFTS (Extended Content)
  // =========================================================================

  const comparisons = generateComparisons(entities, destination, cfg);
  tasks.push(...comparisons.map(t => ({ ...t, createdAt: now })));

  const extendedRankings = generateExtendedRankings(byType, destination, cfg);
  tasks.push(...extendedRankings.map(t => ({ ...t, createdAt: now })));

  for (const entity of entities) {
    const rules = ENTITY_CONTENT_RULES[entity.type];
    if (rules?.draft.includes('tips_article')) {
      tasks.push(createTipsArticleTask(entity, destination, now));
    }
    if (rules?.draft.includes('photo_spots')) {
      tasks.push(createPhotoSpotsTask(entity, destination, now));
    }
  }

  const roundups = generateCategoryRoundups(byType, destination, cfg);
  tasks.push(...roundups.map(t => ({ ...t, createdAt: now })));

  if (cfg.generateBudgetGuides) {
    const budgetGuides = generateBudgetGuides(byType, destination);
    tasks.push(...budgetGuides.map(t => ({ ...t, createdAt: now })));
  }

  if (cfg.generateSeasonalContent) {
    const seasonalContent = generateSeasonalContent(destination, byType);
    tasks.push(...seasonalContent.map(t => ({ ...t, createdAt: now })));
  }

  if (cfg.generateHiddenGems) {
    const hiddenGems = generateHiddenGems(entities, destination);
    tasks.push(...hiddenGems.map(t => ({ ...t, createdAt: now })));
  }

  const itineraries = generateItineraries(entities, destination);
  tasks.push(...itineraries.map(t => ({ ...t, createdAt: now })));

  if (cfg.generateMonthlyGuides) {
    const monthlyGuides = generateMonthlyGuides(destination, byType, cfg);
    tasks.push(...monthlyGuides.map(t => ({ ...t, createdAt: now })));
  }

  if (cfg.generateAudienceGuides) {
    const audienceGuides = generateAudienceGuides(destination, byType, cfg);
    tasks.push(...audienceGuides.map(t => ({ ...t, createdAt: now })));
  }

  if (cfg.generateCategoryGuides) {
    const categoryGuides = generateCategoryGuides(destination, byType);
    tasks.push(...categoryGuides.map(t => ({ ...t, createdAt: now })));
  }

  const touristContent = generateTouristTipsContent(destination, byType);
  tasks.push(...touristContent.map(t => ({ ...t, createdAt: now })));

  const stats = calculateStats(tasks);

  return { tasks, stats };
}

// ============================================================================
// TASK GENERATORS
// ============================================================================

function createEntityPageTask(
  entity: ExtractedEntity,
  destination: string,
  createdAt: Date
): ContentTask {
  return {
    id: `page-${entity.id}`,
    type: 'entity_page',
    title: entity.name,
    slug: `/${destination.toLowerCase()}/${entity.type}s/${slugify(entity.name)}`,
    priority: 'critical',
    tier: 'immediate',
    entities: [entity.id],
    primaryEntity: entity.id,
    destination,
    area: entity.location?.neighborhood,
    templateId: `${entity.type}-page`,
    variables: {
      entity,
      entityType: entity.type,
    },
    estimatedWords: 1500,
    dependsOn: [],
    status: 'pending',
    createdAt,
  };
}

function createFAQPageTask(
  entity: ExtractedEntity,
  destination: string,
  createdAt: Date
): ContentTask {
  return {
    id: `faq-${entity.id}`,
    type: 'faq_page',
    title: `${entity.name} FAQ`,
    slug: `/${destination.toLowerCase()}/${entity.type}s/${slugify(entity.name)}/faq`,
    priority: 'high',
    tier: 'immediate',
    entities: [entity.id],
    primaryEntity: entity.id,
    destination,
    area: entity.location?.neighborhood,
    templateId: 'faq-page',
    variables: {
      entity,
      questionCount: 10,
    },
    estimatedWords: 800,
    dependsOn: [`page-${entity.id}`],
    status: 'pending',
    createdAt,
  };
}

function createAreaGuideTask(
  entity: ExtractedEntity,
  destination: string,
  createdAt: Date
): ContentTask {
  return {
    id: `area-${entity.id}`,
    type: 'area_guide',
    title: `${entity.name} Area Guide`,
    slug: `/${destination.toLowerCase()}/areas/${slugify(entity.name)}`,
    priority: 'critical',
    tier: 'immediate',
    entities: [entity.id],
    primaryEntity: entity.id,
    destination,
    area: entity.name,
    templateId: 'area-guide',
    variables: {
      area: entity,
    },
    estimatedWords: 2000,
    dependsOn: [],
    status: 'pending',
    createdAt,
  };
}

function createNeighborhoodUpdateTask(
  area: string,
  entities: ExtractedEntity[],
  destination: string,
  createdAt: Date
): ContentTask {
  return {
    id: `neighborhood-update-${slugify(area)}`,
    type: 'neighborhood_update',
    title: `${area} - ${destination}`,
    slug: `/${destination.toLowerCase()}/areas/${slugify(area)}`,
    priority: 'high',
    tier: 'immediate',
    entities: entities.map(e => e.id),
    destination,
    area,
    templateId: 'neighborhood-page',
    variables: {
      areaName: area,
      hotels: entities.filter(e => e.type === 'hotel'),
      restaurants: entities.filter(e => e.type === 'restaurant'),
      attractions: entities.filter(e => ['attraction', 'landmark', 'museum'].includes(e.type)),
    },
    estimatedWords: 1800,
    dependsOn: entities.map(e => `page-${e.id}`),
    status: 'pending',
    createdAt,
  };
}

function createWorthItTask(
  entity: ExtractedEntity,
  destination: string,
  createdAt: Date
): ContentTask {
  return {
    id: `worthit-${entity.id}`,
    type: 'worth_it',
    title: `Is ${entity.name} Worth It?`,
    slug: `/${destination.toLowerCase()}/reviews/is-${slugify(entity.name)}-worth-it`,
    priority: 'medium',
    tier: 'immediate',
    entities: [entity.id],
    primaryEntity: entity.id,
    destination,
    area: entity.location?.neighborhood,
    templateId: 'worth-it-review',
    variables: {
      entity,
      pros: [],
      cons: [],
      verdict: '',
    },
    estimatedWords: 1200,
    dependsOn: [`page-${entity.id}`],
    status: 'pending',
    createdAt,
  };
}

function createHiddenGemTask(
  entity: ExtractedEntity,
  destination: string,
  createdAt: Date
): ContentTask {
  return {
    id: `gem-${entity.id}`,
    type: 'hidden_gems',
    title: `${entity.name}: A Local Secret in ${destination}`,
    slug: `/${destination.toLowerCase()}/hidden-gems/${slugify(entity.name)}`,
    priority: 'medium',
    tier: 'immediate',
    entities: [entity.id],
    primaryEntity: entity.id,
    destination,
    area: entity.location?.neighborhood,
    templateId: 'hidden-gem-page',
    variables: {
      entity,
    },
    estimatedWords: 1000,
    dependsOn: [`page-${entity.id}`],
    status: 'pending',
    createdAt,
  };
}

function createTipsArticleTask(
  entity: ExtractedEntity,
  destination: string,
  createdAt: Date
): ContentTask {
  return {
    id: `tips-${entity.id}`,
    type: 'tips_article',
    title: `Tips for Visiting ${entity.name}`,
    slug: `/${destination.toLowerCase()}/tips/${slugify(entity.name)}-tips`,
    priority: 'medium',
    tier: 'draft',
    entities: [entity.id],
    primaryEntity: entity.id,
    destination,
    area: entity.location?.neighborhood,
    templateId: 'tips-article',
    variables: {
      entity,
    },
    estimatedWords: 1000,
    dependsOn: [`page-${entity.id}`],
    status: 'pending',
    createdAt,
  };
}

function createPhotoSpotsTask(
  entity: ExtractedEntity,
  destination: string,
  createdAt: Date
): ContentTask {
  return {
    id: `photo-${entity.id}`,
    type: 'photo_spots',
    title: `Best Photo Spots at ${entity.name}`,
    slug: `/${destination.toLowerCase()}/photo-spots/${slugify(entity.name)}`,
    priority: 'low',
    tier: 'draft',
    entities: [entity.id],
    primaryEntity: entity.id,
    destination,
    area: entity.location?.neighborhood,
    templateId: 'photo-spots',
    variables: {
      entity,
    },
    estimatedWords: 800,
    dependsOn: [`page-${entity.id}`],
    status: 'pending',
    createdAt,
  };
}

function generateComparisons(
  entities: ExtractedEntity[],
  destination: string,
  config: MultiplicationConfig
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];
  const maxComparisons = config.maxComparisons || Infinity;

  const byType = groupByType(entities);

  for (const [type, typeEntities] of Object.entries(byType)) {
    if (typeEntities.length < 2) continue;

    const sorted = typeEntities.sort((a, b) => b.confidence - a.confidence);

    let comparisonCount = 0;
    for (let i = 0; i < sorted.length && comparisonCount < maxComparisons; i++) {
      for (let j = i + 1; j < sorted.length && comparisonCount < maxComparisons; j++) {
        const entityA = sorted[i];
        const entityB = sorted[j];

        if (!areComparable(entityA, entityB)) continue;

        tasks.push({
          id: `compare-${entityA.id}-vs-${entityB.id}`,
          type: 'comparison',
          title: `${entityA.name} vs ${entityB.name}`,
          slug: `/${destination.toLowerCase()}/compare/${slugify(entityA.name)}-vs-${slugify(entityB.name)}`,
          priority: 'medium',
          tier: 'draft',
          entities: [entityA.id, entityB.id],
          destination,
          area: entityA.location?.neighborhood,
          templateId: 'comparison-article',
          variables: {
            entityA,
            entityB,
            entityType: type,
          },
          estimatedWords: 1500,
          dependsOn: [`page-${entityA.id}`, `page-${entityB.id}`],
          status: 'pending',
        });

        comparisonCount++;
      }
    }
  }

  return tasks;
}

function generatePrimaryRankings(
  byType: Record<string, ExtractedEntity[]>,
  destination: string,
  config: MultiplicationConfig
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];

  for (const [type, entities] of Object.entries(byType)) {
    if (entities.length < 3) continue;

    tasks.push({
      id: `ranking-top-${type}s-${slugify(destination)}`,
      type: 'ranking',
      title: `Top ${Math.min(entities.length, 10)} ${capitalize(type)}s in ${destination}`,
      slug: `/${destination.toLowerCase()}/best-${type}s`,
      priority: 'critical',
      tier: 'immediate',
      entities: entities.slice(0, 10).map(e => e.id),
      destination,
      templateId: 'ranking-article',
      variables: {
        entities: entities.slice(0, 10),
        entityType: type,
        rankingType: 'top',
      },
      estimatedWords: 2500,
      dependsOn: entities.slice(0, 10).map(e => `page-${e.id}`),
      status: 'pending',
    });
  }

  return tasks;
}

function generateExtendedRankings(
  byType: Record<string, ExtractedEntity[]>,
  destination: string,
  config: MultiplicationConfig
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];
  const maxRankings = config.maxRankings || Infinity;
  let rankingCount = 0;

  for (const [type, entities] of Object.entries(byType)) {
    if (entities.length < 3) continue;

    const byArea = groupByNeighborhood(entities);
    const byPrice = groupByPriceLevel(entities);

    for (const [area, areaEntities] of Object.entries(byArea)) {
      if (areaEntities.length >= 3 && rankingCount < maxRankings) {
        tasks.push({
          id: `ranking-${type}s-${slugify(area)}`,
          type: 'ranking',
          title: `Best ${capitalize(type)}s in ${area}`,
          slug: `/${destination.toLowerCase()}/${slugify(area)}/best-${type}s`,
          priority: 'medium',
          tier: 'draft',
          entities: areaEntities.slice(0, 10).map(e => e.id),
          destination,
          area,
          templateId: 'ranking-article',
          variables: {
            entities: areaEntities.slice(0, 10),
            entityType: type,
            area,
            rankingType: 'area',
          },
          estimatedWords: 1800,
          dependsOn: areaEntities.slice(0, 10).map(e => `page-${e.id}`),
          status: 'pending',
        });
        rankingCount++;
      }
    }

    for (const [priceLabel, priceEntities] of Object.entries(byPrice)) {
      if (priceEntities.length >= 3 && rankingCount < maxRankings) {
        tasks.push({
          id: `ranking-${priceLabel}-${type}s`,
          type: 'ranking',
          title: `Best ${capitalize(priceLabel)} ${capitalize(type)}s in ${destination}`,
          slug: `/${destination.toLowerCase()}/${priceLabel}-${type}s`,
          priority: 'medium',
          tier: 'draft',
          entities: priceEntities.slice(0, 10).map(e => e.id),
          destination,
          templateId: 'ranking-article',
          variables: {
            entities: priceEntities.slice(0, 10),
            entityType: type,
            priceLevel: priceLabel,
            rankingType: 'price',
          },
          estimatedWords: 1800,
          dependsOn: priceEntities.slice(0, 10).map(e => `page-${e.id}`),
          status: 'pending',
        });
        rankingCount++;
      }
    }

    const audiences = ['families', 'couples', 'solo-travelers', 'first-timers'];
    for (const audience of audiences) {
      if (entities.length >= 3 && rankingCount < maxRankings) {
        tasks.push({
          id: `ranking-${type}s-for-${audience}`,
          type: 'ranking',
          title: `Best ${capitalize(type)}s for ${capitalize(audience.replace('-', ' '))} in ${destination}`,
          slug: `/${destination.toLowerCase()}/${type}s-for-${audience}`,
          priority: 'medium',
          tier: 'draft',
          entities: entities.slice(0, 10).map(e => e.id),
          destination,
          templateId: 'ranking-article',
          variables: {
            entities: entities.slice(0, 10),
            entityType: type,
            audience,
            rankingType: 'audience',
          },
          estimatedWords: 1800,
          dependsOn: entities.slice(0, 10).map(e => `page-${e.id}`),
          status: 'pending',
        });
        rankingCount++;
      }
    }

    if (entities.length >= 3 && rankingCount < maxRankings) {
      tasks.push({
        id: `ranking-instagram-${type}s`,
        type: 'ranking',
        title: `Top Instagram-Worthy ${capitalize(type)}s in ${destination}`,
        slug: `/${destination.toLowerCase()}/instagram-${type}s`,
        priority: 'medium',
        tier: 'draft',
        entities: entities.slice(0, 10).map(e => e.id),
        destination,
        templateId: 'ranking-article',
        variables: {
          entities: entities.slice(0, 10),
          entityType: type,
          rankingType: 'instagram',
        },
        estimatedWords: 1800,
        dependsOn: entities.slice(0, 10).map(e => `page-${e.id}`),
        status: 'pending',
      });
      rankingCount++;
    }

    if (entities.length >= 3 && rankingCount < maxRankings) {
      tasks.push({
        id: `ranking-free-${type}s`,
        type: 'ranking',
        title: `Top Free ${capitalize(type)}s in ${destination}`,
        slug: `/${destination.toLowerCase()}/free-${type}s`,
        priority: 'medium',
        tier: 'draft',
        entities: entities.slice(0, 10).map(e => e.id),
        destination,
        templateId: 'ranking-article',
        variables: {
          entities: entities.slice(0, 10),
          entityType: type,
          rankingType: 'free',
        },
        estimatedWords: 1800,
        dependsOn: entities.slice(0, 10).map(e => `page-${e.id}`),
        status: 'pending',
      });
      rankingCount++;
    }
  }

  return tasks;
}

function generateCategoryRoundups(
  byType: Record<string, ExtractedEntity[]>,
  destination: string,
  config: MultiplicationConfig
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];

  const audiences = ['families', 'couples', 'solo-travelers', 'business', 'groups', 'first-timers'];
  const occasions = ['romantic-dinner', 'business-lunch', 'special-occasion', 'casual-dining', 'brunch', 'late-night'];

  const hotels = byType['hotel'] || [];
  if (hotels.length >= 3) {
    for (const audience of audiences) {
      tasks.push({
        id: `roundup-hotels-${audience}`,
        type: 'category_roundup',
        title: `Best Hotels for ${capitalize(audience.replace('-', ' '))} in ${destination}`,
        slug: `/${destination.toLowerCase()}/hotels-for-${audience}`,
        priority: 'low',
        tier: 'draft',
        entities: hotels.map(e => e.id),
        destination,
        templateId: 'category-roundup',
        variables: {
          entities: hotels,
          category: 'hotels',
          audience,
        },
        estimatedWords: 1500,
        dependsOn: hotels.map(e => `page-${e.id}`),
        status: 'pending',
      });
    }
  }

  const restaurants = byType['restaurant'] || [];
  if (restaurants.length >= 3) {
    for (const occasion of occasions) {
      tasks.push({
        id: `roundup-restaurants-${occasion}`,
        type: 'category_roundup',
        title: `Best ${capitalize(occasion.replace('-', ' '))} Spots in ${destination}`,
        slug: `/${destination.toLowerCase()}/${occasion}-restaurants`,
        priority: 'low',
        tier: 'draft',
        entities: restaurants.map(e => e.id),
        destination,
        templateId: 'category-roundup',
        variables: {
          entities: restaurants,
          category: 'restaurants',
          occasion,
        },
        estimatedWords: 1500,
        dependsOn: restaurants.map(e => `page-${e.id}`),
        status: 'pending',
      });
    }
  }

  const attractions = byType['attraction'] || [];
  if (attractions.length >= 3) {
    const activityTypes = ['outdoor', 'indoor', 'cultural', 'adventure', 'relaxation'];
    for (const activityType of activityTypes) {
      tasks.push({
        id: `roundup-attractions-${activityType}`,
        type: 'category_roundup',
        title: `Best ${capitalize(activityType)} Activities in ${destination}`,
        slug: `/${destination.toLowerCase()}/${activityType}-activities`,
        priority: 'low',
        tier: 'draft',
        entities: attractions.map(e => e.id),
        destination,
        templateId: 'category-roundup',
        variables: {
          entities: attractions,
          category: 'attractions',
          activityType,
        },
        estimatedWords: 1500,
        dependsOn: attractions.map(e => `page-${e.id}`),
        status: 'pending',
      });
    }
  }

  return tasks;
}

function generateBudgetGuides(
  byType: Record<string, ExtractedEntity[]>,
  destination: string
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];

  tasks.push({
    id: `budget-guide-${slugify(destination)}`,
    type: 'budget_guide',
    title: `${destination} on a Budget: Complete Guide`,
    slug: `/${destination.toLowerCase()}/budget-guide`,
    priority: 'medium',
    tier: 'draft',
    entities: Object.values(byType).flat().map(e => e.id),
    destination,
    templateId: 'budget-guide',
    variables: {
      hotels: byType['hotel'] || [],
      restaurants: byType['restaurant'] || [],
      attractions: byType['attraction'] || [],
    },
    estimatedWords: 3000,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `luxury-guide-${slugify(destination)}`,
    type: 'budget_guide',
    title: `Luxury ${destination}: Ultimate Guide`,
    slug: `/${destination.toLowerCase()}/luxury-guide`,
    priority: 'low',
    tier: 'draft',
    entities: Object.values(byType).flat().map(e => e.id),
    destination,
    templateId: 'luxury-guide',
    variables: {
      hotels: byType['hotel'] || [],
      restaurants: byType['restaurant'] || [],
    },
    estimatedWords: 2500,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `mid-range-guide-${slugify(destination)}`,
    type: 'budget_guide',
    title: `${destination} Mid-Range Guide: Best Value for Money`,
    slug: `/${destination.toLowerCase()}/mid-range-guide`,
    priority: 'low',
    tier: 'draft',
    entities: Object.values(byType).flat().map(e => e.id),
    destination,
    templateId: 'mid-range-guide',
    variables: {
      hotels: byType['hotel'] || [],
      restaurants: byType['restaurant'] || [],
      attractions: byType['attraction'] || [],
    },
    estimatedWords: 2500,
    dependsOn: [],
    status: 'pending',
  });

  return tasks;
}

function generateSeasonalContent(
  destination: string,
  byType: Record<string, ExtractedEntity[]>
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];
  const seasons = ['spring', 'summer', 'fall', 'winter'];

  for (const season of seasons) {
    tasks.push({
      id: `seasonal-${season}-${slugify(destination)}`,
      type: 'seasonal',
      title: `${destination} in ${capitalize(season)}: What to Expect`,
      slug: `/${destination.toLowerCase()}/${season}-travel-guide`,
      priority: 'low',
      tier: 'draft',
      entities: Object.values(byType).flat().map(e => e.id),
      destination,
      templateId: 'seasonal-guide',
      variables: {
        season,
        attractions: byType['attraction'] || [],
      },
      estimatedWords: 1500,
      dependsOn: [],
      status: 'pending',
    });
  }

  return tasks;
}

function generateMonthlyGuides(
  destination: string,
  byType: Record<string, ExtractedEntity[]>,
  config: MultiplicationConfig
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const maxMonthlyGuides = config.maxMonthlyGuides || 12;

  for (let i = 0; i < Math.min(months.length, maxMonthlyGuides); i++) {
    const month = months[i];
    tasks.push({
      id: `monthly-${month}-${slugify(destination)}`,
      type: 'monthly_guide',
      title: `${destination} in ${capitalize(month)}: Complete Travel Guide`,
      slug: `/${destination.toLowerCase()}/${month}-travel-guide`,
      priority: 'low',
      tier: 'draft',
      entities: Object.values(byType).flat().map(e => e.id),
      destination,
      templateId: 'monthly-guide',
      variables: {
        month,
        monthIndex: i,
        attractions: byType['attraction'] || [],
        events: byType['event'] || [],
      },
      estimatedWords: 2000,
      dependsOn: [],
      status: 'pending',
    });
  }

  return tasks;
}

function generateAudienceGuides(
  destination: string,
  byType: Record<string, ExtractedEntity[]>,
  config: MultiplicationConfig
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];
  const audiences = [
    { id: 'families', title: 'Families with Kids', slug: 'family-travel-guide' },
    { id: 'couples', title: 'Couples & Honeymooners', slug: 'couples-travel-guide' },
    { id: 'solo', title: 'Solo Travelers', slug: 'solo-travel-guide' },
    { id: 'budget', title: 'Budget Travelers', slug: 'budget-travel-guide' },
    { id: 'luxury', title: 'Luxury Travelers', slug: 'luxury-travel-guide' },
    { id: 'first-timers', title: 'First-Time Visitors', slug: 'first-time-visitors-guide' },
    { id: 'seniors', title: 'Senior Travelers', slug: 'senior-travel-guide' },
    { id: 'adventure', title: 'Adventure Seekers', slug: 'adventure-travel-guide' },
  ];
  const maxAudienceGuides = config.maxAudienceGuides || 6;

  for (let i = 0; i < Math.min(audiences.length, maxAudienceGuides); i++) {
    const audience = audiences[i];
    tasks.push({
      id: `audience-${audience.id}-${slugify(destination)}`,
      type: 'audience_guide',
      title: `${destination} for ${audience.title}: Complete Guide`,
      slug: `/${destination.toLowerCase()}/${audience.slug}`,
      priority: 'medium',
      tier: 'draft',
      entities: Object.values(byType).flat().map(e => e.id),
      destination,
      templateId: 'audience-guide',
      variables: {
        audience: audience.id,
        audienceTitle: audience.title,
        hotels: byType['hotel'] || [],
        restaurants: byType['restaurant'] || [],
        attractions: byType['attraction'] || [],
      },
      estimatedWords: 2500,
      dependsOn: [],
      status: 'pending',
    });
  }

  return tasks;
}

function generateDestinationMasterGuide(
  entities: ExtractedEntity[],
  destination: string
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];
  const byType = groupByType(entities);

  tasks.push({
    id: `master-guide-${slugify(destination)}`,
    type: 'destination_guide',
    title: `${destination} Travel Guide: Everything You Need to Know`,
    slug: `/${destination.toLowerCase()}/complete-travel-guide`,
    priority: 'critical',
    tier: 'immediate',
    entities: entities.map(e => e.id),
    destination,
    templateId: 'destination-master-guide',
    variables: {
      hotels: byType['hotel'] || [],
      restaurants: byType['restaurant'] || [],
      attractions: byType['attraction'] || [],
      neighborhoods: byType['neighborhood'] || [],
      beaches: byType['beach'] || [],
      museums: byType['museum'] || [],
      parks: byType['park'] || [],
      landmarks: byType['landmark'] || [],
      malls: byType['mall'] || [],
      transport: byType['transport'] || [],
      events: byType['event'] || [],
    },
    estimatedWords: 5000,
    dependsOn: [],
    status: 'pending',
  });

  return tasks;
}

function generateCategoryGuides(
  destination: string,
  byType: Record<string, ExtractedEntity[]>
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];

  tasks.push({
    id: `temple-guide-${slugify(destination)}`,
    type: 'temple_guide',
    title: `Complete Guide to ${destination} Temples and Religious Sites`,
    slug: `/${destination.toLowerCase()}/temple-guide`,
    priority: 'medium',
    tier: 'draft',
    entities: (byType['attraction'] || []).map(e => e.id),
    destination,
    templateId: 'temple-guide',
    variables: {
      attractions: byType['attraction'] || [],
    },
    estimatedWords: 2500,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `street-food-guide-${slugify(destination)}`,
    type: 'street_food_guide',
    title: `Best Street Food in ${destination}: A Complete Guide`,
    slug: `/${destination.toLowerCase()}/street-food-guide`,
    priority: 'medium',
    tier: 'draft',
    entities: (byType['restaurant'] || []).map(e => e.id),
    destination,
    templateId: 'street-food-guide',
    variables: {
      restaurants: byType['restaurant'] || [],
    },
    estimatedWords: 2500,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `nightlife-guide-${slugify(destination)}`,
    type: 'nightlife_guide',
    title: `${destination} Nightlife Guide: Best Bars and Clubs`,
    slug: `/${destination.toLowerCase()}/nightlife-guide`,
    priority: 'medium',
    tier: 'draft',
    entities: (byType['restaurant'] || []).map(e => e.id),
    destination,
    templateId: 'nightlife-guide',
    variables: {
      restaurants: byType['restaurant'] || [],
    },
    estimatedWords: 2500,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `shopping-guide-${slugify(destination)}`,
    type: 'shopping_guide',
    title: `Where to Shop in ${destination}: Complete Shopping Guide`,
    slug: `/${destination.toLowerCase()}/shopping-guide`,
    priority: 'medium',
    tier: 'draft',
    entities: (byType['mall'] || []).map(e => e.id),
    destination,
    templateId: 'shopping-guide',
    variables: {
      malls: byType['mall'] || [],
    },
    estimatedWords: 2500,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `transportation-guide-${slugify(destination)}`,
    type: 'transportation_guide',
    title: `Getting Around ${destination}: Transportation Guide`,
    slug: `/${destination.toLowerCase()}/transportation-guide`,
    priority: 'high',
    tier: 'draft',
    entities: (byType['transport'] || []).map(e => e.id),
    destination,
    templateId: 'transportation-guide',
    variables: {
      transport: byType['transport'] || [],
    },
    estimatedWords: 2000,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `free-activities-guide-${slugify(destination)}`,
    type: 'free_activities',
    title: `Free Things to Do in ${destination}`,
    slug: `/${destination.toLowerCase()}/free-things-to-do`,
    priority: 'medium',
    tier: 'draft',
    entities: (byType['attraction'] || []).map(e => e.id),
    destination,
    templateId: 'free-activities-guide',
    variables: {
      attractions: byType['attraction'] || [],
      parks: byType['park'] || [],
      beaches: byType['beach'] || [],
    },
    estimatedWords: 2000,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `photo-spots-guide-${slugify(destination)}`,
    type: 'photo_spots',
    title: `Most Instagrammable Places in ${destination}`,
    slug: `/${destination.toLowerCase()}/instagram-photo-spots`,
    priority: 'medium',
    tier: 'draft',
    entities: Object.values(byType).flat().map(e => e.id),
    destination,
    templateId: 'photo-spots-guide',
    variables: {
      attractions: byType['attraction'] || [],
      landmarks: byType['landmark'] || [],
      beaches: byType['beach'] || [],
    },
    estimatedWords: 2000,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `michelin-guide-${slugify(destination)}`,
    type: 'michelin_guide',
    title: `Fine Dining in ${destination}: Best Restaurants`,
    slug: `/${destination.toLowerCase()}/fine-dining-guide`,
    priority: 'low',
    tier: 'draft',
    entities: (byType['restaurant'] || []).map(e => e.id),
    destination,
    templateId: 'michelin-guide',
    variables: {
      restaurants: byType['restaurant'] || [],
    },
    estimatedWords: 2500,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `markets-guide-${slugify(destination)}`,
    type: 'shopping_guide',
    title: `Best Markets in ${destination}`,
    slug: `/${destination.toLowerCase()}/markets-guide`,
    priority: 'medium',
    tier: 'draft',
    entities: (byType['mall'] || []).map(e => e.id),
    destination,
    templateId: 'markets-guide',
    variables: {
      malls: byType['mall'] || [],
    },
    estimatedWords: 2000,
    dependsOn: [],
    status: 'pending',
  });

  const cuisines = ['thai', 'italian', 'japanese', 'indian', 'chinese', 'local'];
  for (const cuisine of cuisines) {
    tasks.push({
      id: `cuisine-${cuisine}-${slugify(destination)}`,
      type: 'cuisine_guide',
      title: `Best ${capitalize(cuisine)} Food in ${destination}`,
      slug: `/${destination.toLowerCase()}/${cuisine}-food-guide`,
      priority: 'low',
      tier: 'draft',
      entities: (byType['restaurant'] || []).map(e => e.id),
      destination,
      templateId: 'cuisine-guide',
      variables: {
        cuisine,
        restaurants: byType['restaurant'] || [],
      },
      estimatedWords: 1800,
      dependsOn: [],
      status: 'pending',
    });
  }

  return tasks;
}

function generateTouristTipsContent(
  destination: string,
  byType: Record<string, ExtractedEntity[]>
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];

  tasks.push({
    id: `tourist-tips-${slugify(destination)}`,
    type: 'tourist_tips',
    title: `Essential Tips for Tourists Visiting ${destination}`,
    slug: `/${destination.toLowerCase()}/tourist-tips`,
    priority: 'high',
    tier: 'draft',
    entities: Object.values(byType).flat().map(e => e.id),
    destination,
    templateId: 'tourist-tips',
    variables: {},
    estimatedWords: 2000,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `mistakes-article-${slugify(destination)}`,
    type: 'mistakes_article',
    title: `Common Tourist Mistakes to Avoid in ${destination}`,
    slug: `/${destination.toLowerCase()}/tourist-mistakes-to-avoid`,
    priority: 'medium',
    tier: 'draft',
    entities: Object.values(byType).flat().map(e => e.id),
    destination,
    templateId: 'mistakes-article',
    variables: {},
    estimatedWords: 1800,
    dependsOn: [],
    status: 'pending',
  });

  tasks.push({
    id: `laws-article-${slugify(destination)}`,
    type: 'laws_article',
    title: `Important Rules and Laws for Tourists in ${destination}`,
    slug: `/${destination.toLowerCase()}/local-laws-for-tourists`,
    priority: 'medium',
    tier: 'draft',
    entities: Object.values(byType).flat().map(e => e.id),
    destination,
    templateId: 'laws-article',
    variables: {},
    estimatedWords: 1500,
    dependsOn: [],
    status: 'pending',
  });

  return tasks;
}

function generateHiddenGems(
  entities: ExtractedEntity[],
  destination: string
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];

  const gems = entities.filter(e =>
    e.confidence > 0.5 && e.confidence < 0.8
  );

  if (gems.length >= 3) {
    tasks.push({
      id: `hidden-gems-${slugify(destination)}`,
      type: 'hidden_gems',
      title: `Hidden Gems in ${destination}: Local Secrets`,
      slug: `/${destination.toLowerCase()}/hidden-gems`,
      priority: 'medium',
      tier: 'draft',
      entities: gems.map(e => e.id),
      destination,
      templateId: 'hidden-gems',
      variables: {
        entities: gems,
      },
      estimatedWords: 2000,
      dependsOn: gems.map(e => `page-${e.id}`),
      status: 'pending',
    });
  }

  const byArea = groupByArea(gems);
  for (const [area, areaGems] of Object.entries(byArea)) {
    if (area && areaGems.length >= 2) {
      tasks.push({
        id: `hidden-gems-${slugify(area)}`,
        type: 'hidden_gems',
        title: `Hidden Gems in ${area}`,
        slug: `/${destination.toLowerCase()}/${slugify(area)}/hidden-gems`,
        priority: 'low',
        tier: 'draft',
        entities: areaGems.map(e => e.id),
        destination,
        area,
        templateId: 'hidden-gems',
        variables: {
          entities: areaGems,
          area,
        },
        estimatedWords: 1200,
        dependsOn: areaGems.map(e => `page-${e.id}`),
        status: 'pending',
      });
    }
  }

  return tasks;
}

function generateItineraries(
  entities: ExtractedEntity[],
  destination: string
): Omit<ContentTask, 'createdAt'>[] {
  const tasks: Omit<ContentTask, 'createdAt'>[] = [];

  const durations = [
    { days: 1, title: 'One Day', slug: '1-day' },
    { days: 2, title: '2 Days', slug: '2-days' },
    { days: 3, title: '3 Days', slug: '3-days' },
    { days: 4, title: '4 Days', slug: '4-days' },
    { days: 5, title: '5 Days', slug: '5-days' },
    { days: 7, title: 'One Week', slug: 'one-week' },
    { days: 10, title: '10 Days', slug: '10-days' },
    { days: 14, title: 'Two Weeks', slug: 'two-weeks' },
  ];

  for (const duration of durations) {
    tasks.push({
      id: `itinerary-${duration.slug}-${slugify(destination)}`,
      type: 'itinerary',
      title: `${duration.title} in ${destination}: Perfect Itinerary`,
      slug: `/${destination.toLowerCase()}/itinerary/${duration.slug}`,
      priority: duration.days <= 3 ? 'medium' : 'low',
      tier: 'draft',
      entities: entities.map(e => e.id),
      destination,
      templateId: 'itinerary',
      variables: {
        days: duration.days,
        attractions: entities.filter(e => e.type === 'attraction'),
        restaurants: entities.filter(e => e.type === 'restaurant'),
        hotels: entities.filter(e => e.type === 'hotel'),
      },
      estimatedWords: 1500 + (duration.days * 300),
      dependsOn: [],
      status: 'pending',
    });
  }

  const specialItineraries = [
    { id: 'family', title: 'Family', audience: 'families' },
    { id: 'couples', title: 'Romantic', audience: 'couples' },
    { id: 'adventure', title: 'Adventure', audience: 'adventurers' },
    { id: 'budget', title: 'Budget', audience: 'budget-travelers' },
    { id: 'luxury', title: 'Luxury', audience: 'luxury-travelers' },
  ];

  for (const special of specialItineraries) {
    tasks.push({
      id: `itinerary-${special.id}-${slugify(destination)}`,
      type: 'itinerary',
      title: `${special.title} Itinerary for ${destination}`,
      slug: `/${destination.toLowerCase()}/itinerary/${special.id}`,
      priority: 'low',
      tier: 'draft',
      entities: entities.map(e => e.id),
      destination,
      templateId: 'special-itinerary',
      variables: {
        audience: special.audience,
        attractions: entities.filter(e => e.type === 'attraction'),
        restaurants: entities.filter(e => e.type === 'restaurant'),
        hotels: entities.filter(e => e.type === 'hotel'),
      },
      estimatedWords: 2000,
      dependsOn: [],
      status: 'pending',
    });
  }

  return tasks;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function groupByType(entities: ExtractedEntity[]): Record<string, ExtractedEntity[]> {
  const groups: Record<string, ExtractedEntity[]> = {};
  for (const entity of entities) {
    if (!groups[entity.type]) groups[entity.type] = [];
    groups[entity.type].push(entity);
  }
  return groups;
}

function groupByArea(entities: ExtractedEntity[]): Record<string, ExtractedEntity[]> {
  const groups: Record<string, ExtractedEntity[]> = {};
  for (const entity of entities) {
    const area = entity.location?.neighborhood || entity.location?.city || 'unknown';
    if (!groups[area]) groups[area] = [];
    groups[area].push(entity);
  }
  return groups;
}

function groupByNeighborhood(entities: ExtractedEntity[]): Record<string, ExtractedEntity[]> {
  const groups: Record<string, ExtractedEntity[]> = {};
  for (const entity of entities) {
    const neighborhood = entity.location?.neighborhood;
    if (neighborhood) {
      if (!groups[neighborhood]) groups[neighborhood] = [];
      groups[neighborhood].push(entity);
    }
  }
  return groups;
}

function groupByPriceLevel(entities: ExtractedEntity[]): Record<string, ExtractedEntity[]> {
  const groups: Record<string, ExtractedEntity[]> = {
    budget: [],
    'mid-range': [],
    luxury: [],
  };

  for (const entity of entities) {
    const priceRange = (entity as any).priceRange || '';
    if (priceRange.includes('$$$') || priceRange.includes('luxury')) {
      groups['luxury'].push(entity);
    } else if (priceRange.includes('$$') || priceRange.includes('mid')) {
      groups['mid-range'].push(entity);
    } else if (priceRange.includes('$') || priceRange.includes('budget')) {
      groups['budget'].push(entity);
    }
  }

  return groups;
}

function areComparable(a: ExtractedEntity, b: ExtractedEntity): boolean {
  if (a.type !== b.type) return false;

  const priceA = (a as any).priceRange;
  const priceB = (b as any).priceRange;
  if (priceA && priceB) {
    const levelA = priceA.length;
    const levelB = priceB.length;
    if (Math.abs(levelA - levelB) > 1) return false;
  }

  return true;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function calculateStats(tasks: ContentTask[]): MultiplicationResult['stats'] {
  const byType: Record<ContentType, number> = {} as any;
  const byPriority: Record<ContentPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const byTier = { immediate: 0, draft: 0 };
  let totalWords = 0;

  for (const task of tasks) {
    byType[task.type] = (byType[task.type] || 0) + 1;
    byPriority[task.priority]++;
    byTier[task.tier]++;
    totalWords += task.estimatedWords;
  }

  return {
    total: tasks.length,
    byType,
    byTier,
    byPriority,
    estimatedTotalWords: totalWords,
  };
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

export function getNextTasks(
  tasks: ContentTask[],
  maxTasks: number = 10
): ContentTask[] {
  const completedIds = new Set(
    tasks.filter(t => t.status === 'published').map(t => t.id)
  );

  const ready = tasks.filter(t => {
    if (t.status !== 'pending') return false;
    return t.dependsOn.every(depId => completedIds.has(depId));
  });

  const priorityOrder: Record<ContentPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return ready
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, maxTasks);
}

export function getTasksByTier(
  tasks: ContentTask[],
  tier: PublishTier
): ContentTask[] {
  return tasks.filter(t => t.tier === tier);
}

export function getImmediateTasks(tasks: ContentTask[]): ContentTask[] {
  return getTasksByTier(tasks, 'immediate');
}

export function getDraftTasks(tasks: ContentTask[]): ContentTask[] {
  return getTasksByTier(tasks, 'draft');
}
