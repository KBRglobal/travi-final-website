/**
 * Image SEO Utilities
 * Comprehensive utilities for image optimization and SEO
 */

// ==================== Types ====================

export interface ImageSeoData {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
  width?: number;
  height?: number;
  // Multilingual support
  altHe?: string;
  altAr?: string;
  captionHe?: string;
  captionAr?: string;
  // SEO metadata
  keywords?: string[];
  contentLocation?: ImageLocation;
  datePublished?: string;
  author?: string;
  license?: string;
}

export interface ImageLocation {
  name: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
  geo?: {
    latitude: string;
    longitude: string;
  };
}

export interface ImageObjectSchema {
  "@context": string;
  "@type": string;
  contentUrl: string;
  url?: string;
  name: string;
  description: string;
  datePublished?: string;
  author?: {
    "@type": string;
    name: string;
  };
  contentLocation?: {
    "@type": string;
    name: string;
    address?: {
      "@type": string;
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
    geo?: {
      "@type": string;
      latitude: string;
      longitude: string;
    };
  };
  width?: string;
  height?: string;
  encodingFormat?: string;
  license?: string;
}

export type ImageCategory =
  | 'hotel-exterior'
  | 'hotel-lobby'
  | 'hotel-room'
  | 'hotel-pool'
  | 'hotel-dining'
  | 'hotel-facilities'
  | 'hotel-view'
  | 'hotel-beach'
  | 'attraction-architecture'
  | 'attraction-entrance'
  | 'attraction-interior'
  | 'attraction-exhibits'
  | 'attraction-activities'
  | 'attraction-views'
  | 'attraction-night'
  | 'restaurant-exterior'
  | 'restaurant-interior'
  | 'restaurant-dishes'
  | 'restaurant-chef'
  | 'restaurant-bar'
  | 'restaurant-view'
  | 'realestate-exterior'
  | 'realestate-living'
  | 'realestate-kitchen'
  | 'realestate-bedroom'
  | 'realestate-bathroom'
  | 'realestate-balcony'
  | 'realestate-amenities'
  | 'beach-panorama'
  | 'beach-activities'
  | 'beach-sunset'
  | 'beach-facilities'
  | 'event-setup'
  | 'event-crowd'
  | 'event-performance'
  | 'event-fireworks';

export interface ImageSeoValidation {
  isValid: boolean;
  score: number;
  issues: ImageSeoIssue[];
}

export interface ImageSeoIssue {
  type: 'error' | 'warning' | 'info' | 'success';
  field: string;
  message: string;
  recommendation?: string;
}

// ==================== Constants ====================

const BRAND_NAME = 'TripMD';

// Image size specifications (in KB)
export const IMAGE_SIZE_LIMITS = {
  hero: 200,
  featured: 150,
  content: 100,
  thumbnail: 50,
  gallery: 120,
  mobileHero: 150,
  socialShare: 100,
};

// Image dimension specifications (in pixels)
export const IMAGE_DIMENSIONS = {
  hero: { width: 1920, height: 1080 },
  featured: { width: 1200, height: 800 },
  content: { width: 800, height: 600 },
  thumbnail: { width: 400, height: 300 },
  gallery: { width: 1000, height: 750 },
  mobileHero: { width: 768, height: 1024 },
  socialShare: { width: 1200, height: 630 },
};

// Dubai areas for location context
export const DUBAI_AREAS = [
  'Downtown Dubai',
  'Dubai Marina',
  'Palm Jumeirah',
  'Jumeirah Beach',
  'Business Bay',
  'DIFC',
  'Al Barsha',
  'Deira',
  'Bur Dubai',
  'JBR',
  'Dubai Creek',
  'Al Fahidi',
  'Zabeel',
  'Dubai Hills',
  'Arabian Ranches',
];

// ==================== Filename Utilities ====================

/**
 * Generate SEO-friendly filename from content
 * Format: [primary-keyword]-[specific-detail]-[context].[ext]
 */
export function generateSeoFilename(
  primaryKeyword: string,
  detail: string,
  context?: string,
  extension: string = 'webp'
): string {
  const parts = [primaryKeyword, detail];
  if (context) parts.push(context);

  return parts
    .map(part =>
      part
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
    )
    .filter(Boolean)
    .join('-') + '.' + extension;
}

/**
 * Validate filename follows SEO best practices
 */
export function validateFilename(filename: string): ImageSeoValidation {
  const issues: ImageSeoIssue[] = [];
  let score = 100;

  // Check for generic names
  const genericPatterns = /^(img|image|photo|picture|untitled|dsc|img_|photo_|\d+)\.(jpg|jpeg|png|webp|gif)$/i;
  if (genericPatterns.test(filename)) {
    issues.push({
      type: 'error',
      field: 'filename',
      message: 'Generic filename detected',
      recommendation: 'Use descriptive keywords in filename (e.g., burj-khalifa-sunset-view.webp)',
    });
    score -= 20;
  }

  // Check for underscores (should use hyphens)
  if (filename.includes('_')) {
    issues.push({
      type: 'warning',
      field: 'filename',
      message: 'Filename contains underscores',
      recommendation: 'Use hyphens (-) instead of underscores (_) for better SEO',
    });
    score -= 5;
  }

  // Check for spaces or special characters
  if (/[^a-z0-9\-.]/.test(filename.toLowerCase())) {
    issues.push({
      type: 'warning',
      field: 'filename',
      message: 'Filename contains special characters or spaces',
      recommendation: 'Use only lowercase letters, numbers, and hyphens',
    });
    score -= 10;
  }

  // Check for WebP format
  if (!filename.toLowerCase().endsWith('.webp')) {
    issues.push({
      type: 'info',
      field: 'filename',
      message: 'Image is not in WebP format',
      recommendation: 'Consider using WebP for better compression and performance',
    });
    score -= 5;
  }

  // Check filename length
  if (filename.length > 100) {
    issues.push({
      type: 'warning',
      field: 'filename',
      message: 'Filename is too long',
      recommendation: 'Keep filenames under 100 characters',
    });
    score -= 5;
  }

  if (issues.length === 0) {
    issues.push({
      type: 'success',
      field: 'filename',
      message: 'Filename follows SEO best practices',
    });
  }

  return {
    isValid: score >= 70,
    score: Math.max(0, score),
    issues,
  };
}

// ==================== Alt Text Utilities ====================

/**
 * Generate SEO-optimized alt text
 * Format: [visual description] + [location context] + [unique detail]
 */
export function generateAltText(
  description: string,
  location?: string,
  detail?: string
): string {
  const parts = [description];
  if (location) parts.push(`in ${location}`);
  if (detail) parts.push(detail);
  return parts.join(' ');
}

/**
 * Validate alt text follows SEO best practices
 */
export function validateAltText(altText: string, primaryKeyword?: string): ImageSeoValidation {
  const issues: ImageSeoIssue[] = [];
  let score = 100;

  if (!altText || altText.trim().length === 0) {
    issues.push({
      type: 'error',
      field: 'alt',
      message: 'Alt text is missing',
      recommendation: 'Add descriptive alt text for accessibility and SEO',
    });
    return { isValid: false, score: 0, issues };
  }

  // Check length
  if (altText.length < 20) {
    issues.push({
      type: 'warning',
      field: 'alt',
      message: `Alt text is too short (${altText.length} chars)`,
      recommendation: 'Aim for 50-125 characters for descriptive alt text',
    });
    score -= 10;
  } else if (altText.length > 125) {
    issues.push({
      type: 'warning',
      field: 'alt',
      message: `Alt text is too long (${altText.length} chars)`,
      recommendation: 'Keep alt text under 125 characters',
    });
    score -= 5;
  }

  // Check for keyword stuffing
  const words = altText.toLowerCase().split(/\s+/);
  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasKeywordStuffing = Object.values(wordCounts).some(count => count > 3);
  if (hasKeywordStuffing) {
    issues.push({
      type: 'warning',
      field: 'alt',
      message: 'Possible keyword stuffing detected',
      recommendation: 'Avoid repeating the same words too many times',
    });
    score -= 15;
  }

  // Check for generic alt text
  const genericPatterns = /^(image|photo|picture|pic|img)(\s+of)?$/i;
  if (genericPatterns.test(altText.trim())) {
    issues.push({
      type: 'error',
      field: 'alt',
      message: 'Generic alt text detected',
      recommendation: 'Describe what is actually shown in the image',
    });
    score -= 20;
  }

  // Check if primary keyword is included (if provided)
  if (primaryKeyword && !altText.toLowerCase().includes(primaryKeyword.toLowerCase())) {
    issues.push({
      type: 'info',
      field: 'alt',
      message: 'Primary keyword not found in alt text',
      recommendation: 'Consider including your primary keyword naturally in the alt text',
    });
    score -= 5;
  }

  // Check for decorative indicators
  if (altText.toLowerCase().includes('decorative') || altText === ' ') {
    issues.push({
      type: 'info',
      field: 'alt',
      message: 'Image marked as decorative',
      recommendation: 'Decorative images should have empty alt text (alt="")',
    });
  }

  if (score >= 85 && issues.filter(i => i.type !== 'success').length === 0) {
    issues.push({
      type: 'success',
      field: 'alt',
      message: 'Alt text is well-optimized',
    });
  }

  return {
    isValid: score >= 60,
    score: Math.max(0, score),
    issues,
  };
}

// ==================== Title Attribute Utilities ====================

/**
 * Generate title attribute
 * Format: [Place/Attraction name] - [Interesting fact/tip] | [Brand]
 */
export function generateImageTitle(
  placeName: string,
  fact?: string,
  brand: string = BRAND_NAME
): string {
  const parts = [placeName];
  if (fact) parts[0] += ` - ${fact}`;
  parts.push(brand);
  return parts.join(' | ');
}

/**
 * Validate title attribute
 */
export function validateTitle(title: string): ImageSeoValidation {
  const issues: ImageSeoIssue[] = [];
  let score = 100;

  if (!title || title.trim().length === 0) {
    issues.push({
      type: 'info',
      field: 'title',
      message: 'Title attribute is missing',
      recommendation: 'Add a title for additional context on hover',
    });
    score -= 10;
  } else {
    if (title.length > 150) {
      issues.push({
        type: 'warning',
        field: 'title',
        message: 'Title is too long',
        recommendation: 'Keep title under 150 characters',
      });
      score -= 5;
    }

    if (!title.includes('|') && !title.includes('-')) {
      issues.push({
        type: 'info',
        field: 'title',
        message: 'Consider adding brand name or additional context',
        recommendation: 'Format: "Place Name - Interesting Fact | Brand"',
      });
    }
  }

  return {
    isValid: score >= 80,
    score: Math.max(0, score),
    issues,
  };
}

// ==================== Schema Markup ====================

/**
 * Generate ImageObject schema markup
 */
export function generateImageObjectSchema(data: ImageSeoData, pageUrl?: string): ImageObjectSchema {
  const schema: ImageObjectSchema = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: data.src,
    name: data.title || data.alt,
    description: data.alt,
  };

  if (pageUrl) {
    schema.url = pageUrl;
  }

  if (data.datePublished) {
    schema.datePublished = data.datePublished;
  }

  if (data.author) {
    schema.author = {
      "@type": "Organization",
      name: data.author,
    };
  }

  if (data.contentLocation) {
    schema.contentLocation = {
      "@type": "Place",
      name: data.contentLocation.name,
    };

    if (data.contentLocation.address) {
      schema.contentLocation.address = {
        "@type": "PostalAddress",
        ...data.contentLocation.address,
      };
    }

    if (data.contentLocation.geo) {
      schema.contentLocation.geo = {
        "@type": "GeoCoordinates",
        ...data.contentLocation.geo,
      };
    }
  }

  if (data.width) {
    schema.width = String(data.width);
  }

  if (data.height) {
    schema.height = String(data.height);
  }

  // Detect format from URL
  const formatMatch = data.src.match(/\.(webp|jpg|jpeg|png|gif)(\?|$)/i);
  if (formatMatch) {
    const format = formatMatch[1].toLowerCase();
    schema.encodingFormat = `image/${format === 'jpg' ? 'jpeg' : format}`;
  }

  if (data.license) {
    schema.license = data.license;
  }

  return schema;
}

// ==================== Comprehensive Image Validation ====================

/**
 * Validate all aspects of image SEO
 */
export function validateImageSeo(
  data: ImageSeoData,
  primaryKeyword?: string
): ImageSeoValidation {
  const allIssues: ImageSeoIssue[] = [];
  let totalScore = 0;
  let validationCount = 0;

  // Validate alt text
  const altValidation = validateAltText(data.alt, primaryKeyword);
  allIssues.push(...altValidation.issues);
  totalScore += altValidation.score;
  validationCount++;

  // Validate title if provided
  if (data.title) {
    const titleValidation = validateTitle(data.title);
    allIssues.push(...titleValidation.issues);
    totalScore += titleValidation.score;
    validationCount++;
  }

  // Validate filename from URL
  const filename = data.src.split('/').pop() || '';
  const filenameValidation = validateFilename(filename);
  allIssues.push(...filenameValidation.issues);
  totalScore += filenameValidation.score;
  validationCount++;

  // Check for dimensions
  if (!data.width || !data.height) {
    allIssues.push({
      type: 'warning',
      field: 'dimensions',
      message: 'Image dimensions not specified',
      recommendation: 'Always specify width and height to prevent layout shift (CLS)',
    });
    totalScore -= 10;
  } else {
    allIssues.push({
      type: 'success',
      field: 'dimensions',
      message: `Dimensions specified: ${data.width}x${data.height}px`,
    });
  }

  // Check for multilingual alt text
  if (!data.altHe) {
    allIssues.push({
      type: 'info',
      field: 'altHe',
      message: 'Hebrew alt text not provided',
      recommendation: 'Add Hebrew alt text for multilingual SEO',
    });
  }

  // Check for caption
  if (!data.caption) {
    allIssues.push({
      type: 'info',
      field: 'caption',
      message: 'Caption not provided',
      recommendation: 'Add a caption with contextual links for better SEO',
    });
  }

  // Check for location data
  if (!data.contentLocation) {
    allIssues.push({
      type: 'info',
      field: 'contentLocation',
      message: 'Location data not provided',
      recommendation: 'Add location data for local SEO benefits',
    });
  }

  const averageScore = validationCount > 0 ? totalScore / validationCount : 0;

  return {
    isValid: averageScore >= 60,
    score: Math.round(averageScore),
    issues: allIssues,
  };
}

// ==================== Srcset Generation ====================

/**
 * Generate srcset for responsive images
 */
export function generateSrcset(
  baseUrl: string,
  widths: number[] = [400, 600, 800, 1000, 1200, 1600, 1920]
): string {
  // Check if URL supports width parameters
  if (baseUrl.includes('unsplash.com')) {
    return widths
      .map(w => `${baseUrl.replace(/w=\d+/, `w=${w}`)} ${w}w`)
      .join(', ');
  }

  // For other URLs, assume they support width parameter
  const separator = baseUrl.includes('?') ? '&' : '?';
  return widths
    .map(w => `${baseUrl}${separator}w=${w} ${w}w`)
    .join(', ');
}

/**
 * Generate sizes attribute based on common breakpoints
 */
export function generateSizes(
  type: 'hero' | 'featured' | 'content' | 'thumbnail' | 'gallery' = 'content'
): string {
  switch (type) {
    case 'hero':
      return '100vw';
    case 'featured':
      return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px';
    case 'content':
      return '(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px';
    case 'thumbnail':
      return '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 400px';
    case 'gallery':
      return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
    default:
      return '100vw';
  }
}

// ==================== Category-Based Templates ====================

/**
 * Get alt text template by category
 */
export function getAltTextTemplate(category: ImageCategory): string {
  const templates: Record<ImageCategory, string> = {
    'hotel-exterior': '[Hotel name] hotel exterior view [time of day] [location]',
    'hotel-lobby': '[Feature] in [Hotel name] lobby [location]',
    'hotel-room': '[Room type] at [Hotel name] with [feature] [view type]',
    'hotel-pool': '[Pool type] pool at [Hotel name] [feature]',
    'hotel-dining': '[Restaurant name] [cuisine type] dining at [Hotel name]',
    'hotel-facilities': '[Facility name] at [Hotel name] [details]',
    'hotel-view': '[View description] from [Hotel name] [location]',
    'hotel-beach': 'Private beach at [Hotel name] with [features]',
    'attraction-architecture': '[Attraction name] [architectural feature] [location]',
    'attraction-entrance': 'Entrance to [Attraction name] [details]',
    'attraction-interior': 'Inside [Attraction name] [specific area]',
    'attraction-exhibits': '[Exhibit name] at [Attraction name]',
    'attraction-activities': '[Activity] at [Attraction name]',
    'attraction-views': 'View from [Attraction name] showing [landmarks]',
    'attraction-night': '[Attraction name] illuminated at night [features]',
    'restaurant-exterior': '[Restaurant name] exterior [location]',
    'restaurant-interior': '[Restaurant name] interior [ambiance description]',
    'restaurant-dishes': '[Dish name] at [Restaurant name]',
    'restaurant-chef': 'Chef [name] at [Restaurant name]',
    'restaurant-bar': 'Bar area at [Restaurant name] [features]',
    'restaurant-view': 'View from [Restaurant name] [description]',
    'realestate-exterior': '[Building name] exterior in [area]',
    'realestate-living': 'Living room in [property type] at [location] [features]',
    'realestate-kitchen': 'Kitchen in [property type] at [location] [features]',
    'realestate-bedroom': '[Bedroom type] in [property type] at [location]',
    'realestate-bathroom': 'Bathroom in [property type] at [location]',
    'realestate-balcony': 'Balcony view from [property type] in [location]',
    'realestate-amenities': '[Amenity name] at [building/complex name]',
    'beach-panorama': 'Panoramic view of [Beach name] [features]',
    'beach-activities': '[Activity] at [Beach name] [context]',
    'beach-sunset': 'Sunset at [Beach name] [features]',
    'beach-facilities': '[Facility] at [Beach name]',
    'event-setup': '[Event name] setup at [venue] [details]',
    'event-crowd': 'Visitors at [Event name] [area/activity]',
    'event-performance': 'Performance at [Event name] [details]',
    'event-fireworks': 'Fireworks display at [Event/Location] [occasion]',
  };

  return templates[category] || '[Description] at [Location] [Details]';
}

/**
 * Get title template by category
 */
export function getTitleTemplate(category: ImageCategory): string {
  const templates: Record<string, string> = {
    'hotel': '[Hotel name] - [Unique feature/fact] | TripMD',
    'attraction': '[Attraction name] - [Interesting fact] | TripMD',
    'restaurant': '[Restaurant name] - [Specialty/unique aspect] | TripMD',
    'realestate': '[Property type] in [Location] - [Key feature] | TripMD',
    'beach': '[Beach name] - [Best known for] | TripMD',
    'event': '[Event name] - [Key highlight] | TripMD',
  };

  const categoryPrefix = category.split('-')[0];
  return templates[categoryPrefix] || '[Name] - [Feature] | TripMD';
}
