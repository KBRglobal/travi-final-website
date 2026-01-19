/**
 * FIELD OWNERSHIP CONTRACTS
 * 
 * This file defines which admin component is the authoritative source for each field.
 * The principle: ONE COMPONENT, ONE FIELD - no overlapping ownership.
 * 
 * RULE: "Railway PostgreSQL as single source of truth" - no auto-generation or fallbacks.
 * All SEO and content fields must be explicitly set by admins via their designated editor.
 */

// ============================================================================
// DESTINATIONS INDEX PAGE (/destinations)
// ============================================================================

export const DESTINATIONS_INDEX_SEO = {
  /**
   * OWNER: /admin/page-seo (PageSeoEditor with pagePath="/destinations")
   * TABLE: page_seo
   * 
   * These fields are controlled exclusively by the Page SEO editor.
   * They define how the /destinations page appears in search engines.
   */
  fields: {
    metaTitle: {
      owner: "/admin/page-seo",
      table: "page_seo",
      limits: { min: 30, max: 60 },
      description: "Title tag for the destinations index page",
    },
    metaDescription: {
      owner: "/admin/page-seo",
      table: "page_seo",
      limits: { min: 120, max: 160 },
      description: "Meta description for SERP snippets",
    },
    ogTitle: {
      owner: "/admin/page-seo",
      table: "page_seo",
      limits: { min: 40, max: 70 },
      description: "Open Graph title for social sharing",
    },
    ogDescription: {
      owner: "/admin/page-seo",
      table: "page_seo",
      limits: { min: 120, max: 160 },
      description: "Open Graph description for social sharing",
    },
    ogImage: {
      owner: "/admin/page-seo",
      table: "page_seo",
      description: "Open Graph image URL for social sharing",
    },
    canonicalUrl: {
      owner: "/admin/page-seo",
      table: "page_seo",
      description: "Canonical URL for duplicate content prevention",
    },
    robotsMeta: {
      owner: "/admin/page-seo",
      table: "page_seo",
      description: "Robots meta directive (index/noindex, follow/nofollow)",
    },
    jsonLdSchema: {
      owner: "/admin/page-seo",
      table: "page_seo",
      description: "JSON-LD structured data schema",
    },
  },
  noFallback: true,
  aiGeneration: "/api/ai/generate-page-seo",
} as const;

// ============================================================================
// INDIVIDUAL DESTINATION PAGES (/destinations/:slug)
// ============================================================================

export const DESTINATION_DETAIL = {
  /**
   * OWNER: /admin/destinations/:id (DestinationEditor tabs)
   * TABLE: travi_destinations
   * 
   * Each destination has its own editor with multiple tabs.
   */
  heroTab: {
    owner: "/admin/destinations/:id/hero",
    table: "travi_destinations",
    fields: {
      heroTitle: {
        limits: { min: 20, max: 60 },
        description: "Main title displayed on destination hero section",
      },
      heroSubtitle: {
        limits: { min: 40, max: 120 },
        description: "Subtitle displayed below hero title",
      },
      heroImage: {
        description: "Hero background image URL",
      },
      heroImageAlt: {
        description: "Alt text for hero image (accessibility + SEO)",
      },
      heroButtonText: {
        description: "CTA button text on hero",
      },
      heroButtonUrl: {
        description: "CTA button destination URL",
      },
    },
  },
  moodTab: {
    owner: "/admin/destinations/:id/mood",
    table: "travi_destinations",
    fields: {
      moodVibe: {
        description: "Mood category (luxury, adventure, cultural, etc.)",
      },
      moodTagline: {
        description: "Short tagline for the destination mood",
      },
      moodPrimaryColor: {
        description: "HSL color for mood theming",
      },
    },
  },
  seoTab: {
    owner: "/admin/destinations/:id/seo",
    table: "travi_destinations",
    fields: {
      metaTitle: {
        limits: { min: 30, max: 60 },
        description: "Title tag for individual destination page",
      },
      metaDescription: {
        limits: { min: 120, max: 160 },
        description: "Meta description for destination page",
      },
      keywords: {
        description: "SEO keywords for the destination",
      },
    },
  },
  cardTab: {
    owner: "/admin/destinations/:id/card",
    table: "travi_destinations",
    fields: {
      cardImage: {
        description: "Card thumbnail image for listings",
      },
      cardImageAlt: {
        description: "Alt text for card image",
      },
      summary: {
        description: "Short summary for destination cards",
      },
    },
  },
  noFallback: true,
} as const;

// ============================================================================
// CHARACTER LIMIT HELPERS
// ============================================================================

export interface CharacterLimits {
  min: number;
  max: number;
}

export function validateCharacterLimits(value: string, limits: CharacterLimits): {
  valid: boolean;
  tooShort: boolean;
  tooLong: boolean;
  length: number;
} {
  const length = value.length;
  const tooShort = length > 0 && length < limits.min;
  const tooLong = length > limits.max;
  return {
    valid: length >= limits.min && length <= limits.max,
    tooShort,
    tooLong,
    length,
  };
}

export function getCharacterLimitMessage(limits: CharacterLimits): string {
  return `${limits.min}-${limits.max} characters recommended`;
}

// ============================================================================
// FIELD LOCK STATES
// ============================================================================

export type FieldLockState = "unlocked" | "locked" | "ai_generated";

export interface FieldWithLock<T = string> {
  value: T | null;
  lockState: FieldLockState;
  lastModifiedBy?: "admin" | "ai" | "system";
  lastModifiedAt?: string;
}

// ============================================================================
// OWNERSHIP VALIDATION
// ============================================================================

/**
 * Validates that a component has ownership rights to modify a field.
 * This is a compile-time documentation helper and runtime warning system.
 */
export function assertFieldOwnership(
  componentPath: string,
  expectedOwner: string,
  fieldName: string
): void {
  if (componentPath !== expectedOwner) {
    console.warn(
      `[FieldOwnership] Warning: ${componentPath} is modifying ${fieldName} ` +
      `which is owned by ${expectedOwner}. This may cause data conflicts.`
    );
  }
}
