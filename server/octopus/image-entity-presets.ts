/**
 * Octopus v2 - Entity Type Image Presets
 * 
 * Pure configuration for image placement rules per entity type.
 * NO AI decisions, NO randomness - just rules.
 * 
 * Each preset defines:
 * - Max hero usage per entity
 * - Max reuse count per asset
 * - Allowed roles for the entity type
 * - Gallery/interior limits
 */

export type EntityType = 'destination' | 'hotel' | 'restaurant' | 'attraction' | 'news';

export type ImageRole = 
  | 'hero' 
  | 'gallery' 
  | 'interior' 
  | 'exterior' 
  | 'cover' 
  | 'food' 
  | 'card' 
  | 'thumbnail' 
  | 'background' 
  | 'og_image';

export interface EntityImagePreset {
  entityType: EntityType;
  maxHeroPerEntity: number;
  maxReusePerAsset: number;
  allowedRoles: ImageRole[];
  maxGalleryImages: number;
  maxInteriorImages: number;
  maxExteriorImages: number;
  requireIntelligenceForHero: boolean;
  minHeroQualityScore: number;
  minHeroRelevanceScore: number;
}

/**
 * Entity presets - SINGLE SOURCE OF TRUTH
 * These rules are deterministic and auditable.
 */
export const ENTITY_PRESETS: Record<EntityType, EntityImagePreset> = {
  destination: {
    entityType: 'destination',
    maxHeroPerEntity: 1,
    maxReusePerAsset: 3,
    allowedRoles: ['hero', 'gallery', 'card', 'thumbnail', 'background', 'og_image'],
    maxGalleryImages: 12,
    maxInteriorImages: 0,
    maxExteriorImages: 8,
    requireIntelligenceForHero: true,
    minHeroQualityScore: 80,
    minHeroRelevanceScore: 70,
  },
  hotel: {
    entityType: 'hotel',
    maxHeroPerEntity: 1,
    maxReusePerAsset: 2,
    allowedRoles: ['hero', 'gallery', 'interior', 'exterior', 'card', 'thumbnail', 'og_image'],
    maxGalleryImages: 20,
    maxInteriorImages: 10,
    maxExteriorImages: 5,
    requireIntelligenceForHero: true,
    minHeroQualityScore: 85,
    minHeroRelevanceScore: 75,
  },
  restaurant: {
    entityType: 'restaurant',
    maxHeroPerEntity: 1,
    maxReusePerAsset: 2,
    allowedRoles: ['hero', 'gallery', 'interior', 'food', 'card', 'thumbnail', 'og_image'],
    maxGalleryImages: 15,
    maxInteriorImages: 6,
    maxExteriorImages: 3,
    requireIntelligenceForHero: true,
    minHeroQualityScore: 80,
    minHeroRelevanceScore: 70,
  },
  attraction: {
    entityType: 'attraction',
    maxHeroPerEntity: 1,
    maxReusePerAsset: 3,
    allowedRoles: ['hero', 'gallery', 'exterior', 'card', 'thumbnail', 'og_image'],
    maxGalleryImages: 10,
    maxInteriorImages: 4,
    maxExteriorImages: 4,
    requireIntelligenceForHero: true,
    minHeroQualityScore: 75,
    minHeroRelevanceScore: 65,
  },
  news: {
    entityType: 'news',
    maxHeroPerEntity: 1,
    maxReusePerAsset: 5,
    allowedRoles: ['hero', 'cover', 'card', 'thumbnail', 'og_image'],
    maxGalleryImages: 5,
    maxInteriorImages: 0,
    maxExteriorImages: 0,
    requireIntelligenceForHero: false,
    minHeroQualityScore: 60,
    minHeroRelevanceScore: 50,
  },
};

/**
 * Get preset for entity type
 */
export function getEntityPreset(entityType: string): EntityImagePreset | null {
  const preset = ENTITY_PRESETS[entityType as EntityType];
  return preset || null;
}

/**
 * Check if role is allowed for entity type
 */
export function isRoleAllowed(entityType: string, role: string): boolean {
  const preset = getEntityPreset(entityType);
  if (!preset) return true; // Allow all roles for unknown entity types
  return preset.allowedRoles.includes(role as ImageRole);
}

/**
 * Get max images allowed for a specific role
 */
export function getMaxImagesForRole(entityType: string, role: string): number {
  const preset = getEntityPreset(entityType);
  if (!preset) return 10; // Default limit for unknown entity types
  
  switch (role) {
    case 'hero':
    case 'cover':
      return preset.maxHeroPerEntity;
    case 'gallery':
      return preset.maxGalleryImages;
    case 'interior':
      return preset.maxInteriorImages;
    case 'exterior':
      return preset.maxExteriorImages;
    default:
      return 10; // Default for other roles
  }
}

/**
 * Check if asset has exceeded reuse limit
 */
export function hasExceededReuseLimit(entityType: string, currentReuseCount: number): boolean {
  const preset = getEntityPreset(entityType);
  if (!preset) return currentReuseCount >= 5; // Default limit
  return currentReuseCount >= preset.maxReusePerAsset;
}
