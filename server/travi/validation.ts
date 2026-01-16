/**
 * TRAVI Content Generation - Validation Utilities
 * 
 * Validates all data before insertion to ensure content quality
 * and meets SEO requirements.
 */

import { z } from 'zod';

// Whitelisted destinations with coordinate bounds
export const WHITELISTED_DESTINATIONS = [
  { slug: 'dubai', city: 'Dubai', country: 'UAE', lat: { min: 24.7, max: 25.6 }, lng: { min: 54.8, max: 55.8 } },
  { slug: 'abu-dhabi', city: 'Abu Dhabi', country: 'UAE', lat: { min: 24.0, max: 24.8 }, lng: { min: 54.0, max: 55.0 } },
  { slug: 'london', city: 'London', country: 'UK', lat: { min: 51.2, max: 51.7 }, lng: { min: -0.5, max: 0.3 } },
  { slug: 'paris', city: 'Paris', country: 'France', lat: { min: 48.7, max: 49.0 }, lng: { min: 2.1, max: 2.6 } },
  { slug: 'new-york', city: 'New York', country: 'USA', lat: { min: 40.5, max: 41.0 }, lng: { min: -74.3, max: -73.7 } },
  { slug: 'tokyo', city: 'Tokyo', country: 'Japan', lat: { min: 35.5, max: 35.9 }, lng: { min: 139.4, max: 140.0 } },
  { slug: 'singapore', city: 'Singapore', country: 'Singapore', lat: { min: 1.1, max: 1.5 }, lng: { min: 103.6, max: 104.1 } },
  { slug: 'bangkok', city: 'Bangkok', country: 'Thailand', lat: { min: 13.5, max: 14.0 }, lng: { min: 100.3, max: 100.8 } },
  { slug: 'barcelona', city: 'Barcelona', country: 'Spain', lat: { min: 41.3, max: 41.5 }, lng: { min: 2.0, max: 2.3 } },
  { slug: 'rome', city: 'Rome', country: 'Italy', lat: { min: 41.8, max: 42.0 }, lng: { min: 12.3, max: 12.7 } },
  { slug: 'amsterdam', city: 'Amsterdam', country: 'Netherlands', lat: { min: 52.3, max: 52.5 }, lng: { min: 4.7, max: 5.1 } },
  { slug: 'hong-kong', city: 'Hong Kong', country: 'Hong Kong', lat: { min: 22.1, max: 22.6 }, lng: { min: 113.8, max: 114.4 } },
  { slug: 'istanbul', city: 'Istanbul', country: 'Turkey', lat: { min: 40.8, max: 41.3 }, lng: { min: 28.6, max: 29.5 } },
  { slug: 'las-vegas', city: 'Las Vegas', country: 'USA', lat: { min: 35.9, max: 36.4 }, lng: { min: -115.4, max: -114.9 } },
  { slug: 'los-angeles', city: 'Los Angeles', country: 'USA', lat: { min: 33.7, max: 34.4 }, lng: { min: -118.7, max: -117.9 } },
  { slug: 'miami', city: 'Miami', country: 'USA', lat: { min: 25.6, max: 26.0 }, lng: { min: -80.4, max: -80.0 } },
  { slug: 'ras-al-khaimah', city: 'Ras Al Khaimah', country: 'UAE', lat: { min: 25.5, max: 26.1 }, lng: { min: 55.7, max: 56.1 } },
] as const;

export type DestinationSlug = typeof WHITELISTED_DESTINATIONS[number]['slug'];

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Location validation schema
const locationSchema = z.object({
  name: z.string().min(3).max(200),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  category: z.enum(['attraction', 'restaurant', 'hotel']),
  city: z.string().min(2),
  country: z.string().min(2),
});

// Coordinate validation
export function validateCoordinates(
  latitude: string | number | undefined | null,
  longitude: string | number | undefined | null,
  destinationSlug?: DestinationSlug
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!latitude || !longitude) {
    errors.push({
      field: 'coordinates',
      message: 'Latitude and longitude are required',
      severity: 'error',
    });
    return { isValid: false, errors, warnings };
  }

  const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

  if (isNaN(lat) || isNaN(lng)) {
    errors.push({
      field: 'coordinates',
      message: 'Invalid coordinate format',
      severity: 'error',
    });
    return { isValid: false, errors, warnings };
  }

  // Basic bounds check
  if (lat < -90 || lat > 90) {
    errors.push({
      field: 'latitude',
      message: 'Latitude must be between -90 and 90',
      severity: 'error',
    });
  }

  if (lng < -180 || lng > 180) {
    errors.push({
      field: 'longitude',
      message: 'Longitude must be between -180 and 180',
      severity: 'error',
    });
  }

  // Destination-specific bounds check
  if (destinationSlug) {
    const destination = WHITELISTED_DESTINATIONS.find(d => d.slug === destinationSlug);
    if (destination) {
      if (lat < destination.lat.min || lat > destination.lat.max ||
          lng < destination.lng.min || lng > destination.lng.max) {
        warnings.push({
          field: 'coordinates',
          message: `Coordinates may be outside ${destination.city} bounds`,
          severity: 'warning',
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Location validation
export function validateLocation(data: {
  name?: string | null;
  slug?: string | null;
  category?: string | null;
  city?: string | null;
  country?: string | null;
}): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Name validation
  if (!data.name || data.name.length < 3) {
    errors.push({
      field: 'name',
      message: 'Location name must be at least 3 characters',
      severity: 'error',
    });
  } else if (data.name.length > 200) {
    errors.push({
      field: 'name',
      message: 'Location name must not exceed 200 characters',
      severity: 'error',
    });
  }

  // Slug validation
  if (!data.slug || data.slug.length < 3) {
    errors.push({
      field: 'slug',
      message: 'Slug must be at least 3 characters',
      severity: 'error',
    });
  } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push({
      field: 'slug',
      message: 'Slug must only contain lowercase letters, numbers, and hyphens',
      severity: 'error',
    });
  }

  // Category validation
  if (!data.category || !['attraction', 'restaurant', 'hotel'].includes(data.category)) {
    errors.push({
      field: 'category',
      message: 'Category must be attraction, restaurant, or hotel',
      severity: 'error',
    });
  }

  // City validation
  if (!data.city || data.city.length < 2) {
    errors.push({
      field: 'city',
      message: 'City is required',
      severity: 'error',
    });
  }

  // Country validation
  if (!data.country || data.country.length < 2) {
    errors.push({
      field: 'country',
      message: 'Country is required',
      severity: 'error',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// LOCKED affiliate link - legal requirement
export const LOCKED_AFFILIATE_LINK = 'https://tiqets.tpo.lu/k16k6RXU';

// Price pattern detection for legal compliance (comprehensive)
const PRICE_PATTERNS = [
  // Currency symbols with amounts
  /\$\s*\d+(?:[\.,]\d+)?/,                    // $100, $ 100, $100.50
  /€\s*\d+(?:[\.,]\d+)?/,                     // €100, € 100
  /£\s*\d+(?:[\.,]\d+)?/,                     // £100, £ 100
  /¥\s*\d+(?:[\.,]\d+)?/,                     // ¥1000
  
  // Currency codes with amounts (before and after)
  /\d+(?:[\.,]\d+)?\s*(?:USD|EUR|GBP|AED|THB|SGD|HKD|JPY|INR)/i,  // 100 USD, 100.50 EUR
  /(?:USD|EUR|GBP|AED|THB|SGD|HKD|JPY|INR)\s*\d+(?:[\.,]\d+)?/i,  // USD 100, AED 100.50
  
  // AED specific (common in Dubai) - including service charges
  /AED\s*\d+(?:\s*\+\+)?/i,                   // AED 100, AED 100++
  /\d+\s*AED(?:\s*\+\+)?/i,                   // 100 AED, 100 AED++
  
  // Written currency words
  /\d+\s*(?:dollar|euro|pound|dirham|baht|yen)/i,
  /(?:dollar|euro|pound|dirham|baht|yen)\s*\d+/i,
  
  // Price/cost keywords with amounts
  /(?:price|prices|priced|cost|costs|fee|fees|rate|rates|fare|fares)\s*[:=]?\s*\$?\d+/i,
  /\d+\s*(?:per\s+(?:person|night|head|ticket|entry))/i,  // 100 per person
  
  // Starting/from prices
  /(?:from|starting\s+at|starts?\s+at|as\s+low\s+as)\s*\$?\d+/i,
  
  // Ticket/admission prices
  /(?:admission|entry|ticket|entrance)\s*[:=]?\s*\$?\d+/i,
  /\$?\d+\s*(?:admission|entry|ticket|entrance)/i,
  
  // Formatted numbers with currency context
  /\d{1,3}(?:,\d{3})+\s*(?:USD|EUR|GBP|AED)/i,  // 1,000 USD
];

// Validate text does not contain prices (legal requirement)
export function validateNoPrices(text: string | null | undefined, field: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!text) return { isValid: true, errors, warnings };

  for (const pattern of PRICE_PATTERNS) {
    if (pattern.test(text)) {
      errors.push({
        field,
        message: `LEGAL VIOLATION: Content contains price information which is prohibited`,
        severity: 'error',
      });
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Validate affiliate link matches locked URL
export function validateAffiliateLink(url: string | null | undefined): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!url) {
    return { isValid: true, errors, warnings };
  }

  if (url !== LOCKED_AFFILIATE_LINK) {
    errors.push({
      field: 'affiliateLink',
      message: `Affiliate link must be locked to ${LOCKED_AFFILIATE_LINK}`,
      severity: 'error',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Content validation
export function validateContent(data: {
  metaTitle?: string | null;
  metaDescription?: string | null;
  shortDescription?: string | null;
  whyVisit?: string | null;
  keyHighlights?: any[];
  faq?: any[];
}): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check for price violations in all text fields
  const textFields = [
    { name: 'metaTitle', value: data.metaTitle },
    { name: 'metaDescription', value: data.metaDescription },
    { name: 'shortDescription', value: data.shortDescription },
    { name: 'whyVisit', value: data.whyVisit },
  ];

  for (const { name, value } of textFields) {
    const priceCheck = validateNoPrices(value, name);
    errors.push(...priceCheck.errors);
  }

  // Check FAQ answers for prices
  if (data.faq && Array.isArray(data.faq)) {
    data.faq.forEach((item, index) => {
      if (item.answer) {
        const faqPriceCheck = validateNoPrices(item.answer, `faq[${index}].answer`);
        errors.push(...faqPriceCheck.errors);
      }
    });
  }

  // Meta title validation (SEO: max 60 characters)
  if (data.metaTitle) {
    if (data.metaTitle.length > 60) {
      errors.push({
        field: 'metaTitle',
        message: 'Meta title must not exceed 60 characters for SEO',
        severity: 'error',
      });
    } else if (data.metaTitle.length < 30) {
      warnings.push({
        field: 'metaTitle',
        message: 'Meta title should be at least 30 characters for better SEO',
        severity: 'warning',
      });
    }
  }

  // Meta description validation (SEO: max 160 characters)
  if (data.metaDescription) {
    if (data.metaDescription.length > 160) {
      errors.push({
        field: 'metaDescription',
        message: 'Meta description must not exceed 160 characters for SEO',
        severity: 'error',
      });
    } else if (data.metaDescription.length < 80) {
      warnings.push({
        field: 'metaDescription',
        message: 'Meta description should be at least 80 characters for better SEO',
        severity: 'warning',
      });
    }
  }

  // Short description validation (minimum word count)
  if (data.shortDescription) {
    const wordCount = data.shortDescription.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 50) {
      warnings.push({
        field: 'shortDescription',
        message: 'Short description should be at least 50 words',
        severity: 'warning',
      });
    }
  }

  // Why visit validation (minimum word count)
  if (data.whyVisit) {
    const wordCount = data.whyVisit.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 100) {
      warnings.push({
        field: 'whyVisit',
        message: 'Why visit section should be at least 100 words',
        severity: 'warning',
      });
    }
  }

  // Key highlights validation
  if (data.keyHighlights && Array.isArray(data.keyHighlights)) {
    if (data.keyHighlights.length < 3) {
      warnings.push({
        field: 'keyHighlights',
        message: 'Should have at least 3 key highlights',
        severity: 'warning',
      });
    }
  }

  // FAQ validation (minimum 7 questions for AEO)
  if (data.faq && Array.isArray(data.faq)) {
    if (data.faq.length < 7) {
      errors.push({
        field: 'faq',
        message: 'FAQ must have at least 7 questions for AEO optimization',
        severity: 'error',
      });
    }
    
    // Validate FAQ structure
    data.faq.forEach((item, index) => {
      if (!item.question || !item.answer) {
        errors.push({
          field: `faq[${index}]`,
          message: 'Each FAQ item must have question and answer',
          severity: 'error',
        });
      } else if (item.answer.length < 50) {
        warnings.push({
          field: `faq[${index}]`,
          message: 'FAQ answers should be at least 50 characters',
          severity: 'warning',
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Image URL validation
export function validateImageUrl(url: string | null | undefined): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!url) {
    errors.push({
      field: 'imageUrl',
      message: 'Image URL is required',
      severity: 'error',
    });
    return { isValid: false, errors, warnings };
  }

  try {
    const parsed = new URL(url);
    
    // Check for HTTPS
    if (parsed.protocol !== 'https:') {
      warnings.push({
        field: 'imageUrl',
        message: 'Image should use HTTPS for security',
        severity: 'warning',
      });
    }

    // Check for common image extensions
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasValidExtension = validExtensions.some(ext => 
      parsed.pathname.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension && !parsed.pathname.includes('/image/')) {
      warnings.push({
        field: 'imageUrl',
        message: 'URL may not be a valid image format',
        severity: 'warning',
      });
    }
  } catch {
    errors.push({
      field: 'imageUrl',
      message: 'Invalid URL format',
      severity: 'error',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Attribution validation
export function validateAttribution(data: {
  source: 'wikipedia' | 'osm' | 'freepik' | 'google';
  attributionText?: string;
  photographerName?: string;
  license?: string;
  sourceUrl?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Source-specific requirements
  switch (data.source) {
    case 'wikipedia':
      if (!data.sourceUrl) {
        errors.push({
          field: 'sourceUrl',
          message: 'Wikipedia source URL is required for CC BY-SA 3.0 compliance',
          severity: 'error',
        });
      }
      break;
    
    case 'osm':
      if (!data.attributionText || !data.attributionText.includes('OpenStreetMap')) {
        errors.push({
          field: 'attributionText',
          message: 'OpenStreetMap attribution required for ODbL compliance',
          severity: 'error',
        });
      }
      break;
    
    case 'freepik':
      if (!data.photographerName) {
        errors.push({
          field: 'photographerName',
          message: 'Photographer credit is required for Freepik images',
          severity: 'error',
        });
      }
      break;
    
    case 'google':
      // Google Places data attribution is handled automatically
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Comprehensive location validation
export function validateFullLocation(data: {
  location: {
    name?: string | null;
    slug?: string | null;
    category?: string | null;
    city?: string | null;
    country?: string | null;
  };
  details?: {
    latitude?: string | number | null;
    longitude?: string | number | null;
  };
  content?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    shortDescription?: string | null;
    whyVisit?: string | null;
    keyHighlights?: any[];
    faq?: any[];
  };
  destinationSlug?: DestinationSlug;
}): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  // Validate location
  const locationResult = validateLocation(data.location);
  allErrors.push(...locationResult.errors);
  allWarnings.push(...locationResult.warnings);

  // Validate coordinates if present
  if (data.details?.latitude || data.details?.longitude) {
    const coordResult = validateCoordinates(
      data.details.latitude,
      data.details.longitude,
      data.destinationSlug
    );
    allErrors.push(...coordResult.errors);
    allWarnings.push(...coordResult.warnings);
  }

  // Validate content if present
  if (data.content) {
    const contentResult = validateContent(data.content);
    allErrors.push(...contentResult.errors);
    allWarnings.push(...contentResult.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

// Slug generator utility
export function generateSlug(name: string, city?: string): string {
  let slug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  if (city) {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    slug = `${citySlug}-${slug}`;
  }

  return slug;
}

// Check if destination is whitelisted
export function isWhitelistedDestination(cityOrSlug: string): boolean {
  const normalized = cityOrSlug.toLowerCase().replace(/\s+/g, '-');
  return WHITELISTED_DESTINATIONS.some(
    d => d.slug === normalized || d.city.toLowerCase() === cityOrSlug.toLowerCase()
  );
}

// Get destination by slug
export function getDestinationBySlug(slug: string) {
  return WHITELISTED_DESTINATIONS.find(d => d.slug === slug);
}
