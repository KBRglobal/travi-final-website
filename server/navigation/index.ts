/**
 * Navigation Intelligence System
 * 
 * Provides utilities for mapping AI suggestions to real site URLs,
 * preventing hallucinated links by validating entities exist in the database.
 * 
 * Usage:
 * ```typescript
 * import { resolveEntityLink, buildUrl, parseUrl, EntityType } from './navigation';
 * 
 * // Validate and get URL for an entity (checks database)
 * const url = await resolveEntityLink('destination', 'dubai');
 * // Returns '/destinations/dubai' if exists, null if not
 * 
 * // Build URL without validation (use when you know entity exists)
 * const url = buildUrl('hotel', 'burj-al-arab');
 * // Returns '/hotels/burj-al-arab'
 * 
 * // Parse a URL to get type and slug
 * const parsed = parseUrl('/attractions/burj-khalifa');
 * // Returns { type: 'attraction', slug: 'burj-khalifa' }
 * ```
 */

// Entity resolver - validates entities exist before returning URLs
export {
  resolveEntityLink,
  resolveEntityLinks,
  validateLinks,
  type EntityType,
} from './entity-resolver';

// URL mapper - builds URLs without database validation
export {
  buildUrl,
  parseUrl,
  getUrlPattern,
  isValidEntityType,
  getSupportedEntityTypes,
} from './url-mapper';

// Journey analyzer - user journey coherence analysis
export {
  analyzeJourneyPath,
  detectDeadEnds,
  getSuggestedLinks,
  getJourneyStage,
  type JourneyStage,
  type JourneyAnalysisResult,
  type DeadEndResult,
  type SuggestedLink,
} from './journey-analyzer';
