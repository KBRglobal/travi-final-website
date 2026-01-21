/**
 * Image SEO Service
 * Advanced SEO optimization for images including naming, ALT text, Schema markup,
 * captions, and AI prompt generation for Dubai travel content
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ContentType =
  | "hotel"
  | "attraction"
  | "restaurant"
  | "beach"
  | "district"
  | "event"
  | "real-estate"
  | "article"
  | "itinerary"
  | "transport";

export type ImageCategory =
  | "exterior"
  | "interior"
  | "lobby"
  | "room"
  | "suite"
  | "pool"
  | "spa"
  | "dining"
  | "view"
  | "beach"
  | "activity"
  | "architecture"
  | "entrance"
  | "exhibit"
  | "dish"
  | "chef"
  | "bar"
  | "balcony"
  | "bedroom"
  | "bathroom"
  | "kitchen"
  | "living-room"
  | "amenities"
  | "panorama"
  | "sunset"
  | "night"
  | "aerial"
  | "crowd"
  | "performance"
  | "fireworks"
  | "hero"
  | "featured"
  | "gallery"
  | "content";

export type ImagePurpose = "hero" | "featured" | "content" | "gallery" | "thumbnail" | "og-image";

export type Language = "en" | "he" | "ar";

export interface DubaiLocation {
  area: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ImageSEOContext {
  contentType: ContentType;
  entityName: string;           // e.g., "Atlantis The Palm"
  entitySlug: string;           // e.g., "atlantis-the-palm"
  location: DubaiLocation;
  category: ImageCategory;
  purpose: ImagePurpose;
  keywords?: string[];
  year?: number;
  timeOfDay?: "day" | "night" | "sunset" | "sunrise";
  uniqueFeature?: string;       // e.g., "underwater-suite", "infinity-pool"
  language?: Language;
}

export interface SEOImageMetadata {
  filename: string;
  alt: {
    en: string;
    he: string;
    ar: string;
  };
  title: {
    en: string;
    he: string;
    ar: string;
  };
  caption: {
    en: string;
    he: string;
    ar: string;
  };
  schema: ImageObjectSchema;
  aiPrompt: string;
  openGraph: OpenGraphImage;
}

export interface ImageObjectSchema {
  "@context": "https://schema.org";
  "@type": "ImageObject";
  contentUrl: string;
  url: string;
  name: string;
  description: string;
  datePublished: string;
  author: {
    "@type": "Organization";
    name: string;
  };
  contentLocation: {
    "@type": "Place";
    name: string;
    address: {
      "@type": "PostalAddress";
      streetAddress?: string;
      addressLocality: string;
      addressRegion: string;
      addressCountry: string;
    };
    geo?: {
      "@type": "GeoCoordinates";
      latitude: string;
      longitude: string;
    };
  };
  width: string;
  height: string;
  encodingFormat: string;
}

export interface OpenGraphImage {
  url: string;
  width: number;
  height: number;
  alt: string;
  type: string;
}

// ============================================================================
// DUBAI AREAS DATABASE
// ============================================================================

export const DUBAI_AREAS: Record<string, {
  name: string;
  nameHe: string;
  nameAr: string;
  landmarks: string[];
  coordinates: { latitude: number; longitude: number };
}> = {
  "downtown-dubai": {
    name: "Downtown Dubai",
    nameHe: "דאונטאון דובאי",
    nameAr: "وسط دبي",
    landmarks: ["Burj Khalifa", "Dubai Mall", "Dubai Fountain"],
    coordinates: { latitude: 25.1972, longitude: 55.2744 }
  },
  "palm-jumeirah": {
    name: "Palm Jumeirah",
    nameHe: "פאלם ג'ומיירה",
    nameAr: "نخلة جميرا",
    landmarks: ["Atlantis The Palm", "The Pointe", "Nakheel Mall"],
    coordinates: { latitude: 25.1124, longitude: 55.1390 }
  },
  "dubai-marina": {
    name: "Dubai Marina",
    nameHe: "דובאי מרינה",
    nameAr: "مرسى دبي",
    landmarks: ["Marina Walk", "JBR Beach", "Ain Dubai"],
    coordinates: { latitude: 25.0805, longitude: 55.1403 }
  },
  "jumeirah": {
    name: "Jumeirah",
    nameHe: "ג'ומיירה",
    nameAr: "جميرا",
    landmarks: ["Burj Al Arab", "Madinat Jumeirah", "Jumeirah Beach"],
    coordinates: { latitude: 25.1412, longitude: 55.1853 }
  },
  "deira": {
    name: "Deira",
    nameHe: "דיירה",
    nameAr: "ديرة",
    landmarks: ["Gold Souk", "Spice Souk", "Deira City Centre"],
    coordinates: { latitude: 25.2697, longitude: 55.3095 }
  },
  "bur-dubai": {
    name: "Bur Dubai",
    nameHe: "בור דובאי",
    nameAr: "بر دبي",
    landmarks: ["Al Fahidi Historical District", "Dubai Museum", "Textile Souk"],
    coordinates: { latitude: 25.2631, longitude: 55.2972 }
  },
  "business-bay": {
    name: "Business Bay",
    nameHe: "ביזנס ביי",
    nameAr: "الخليج التجاري",
    landmarks: ["Dubai Canal", "Bay Avenue", "Executive Towers"],
    coordinates: { latitude: 25.1850, longitude: 55.2624 }
  },
  "difc": {
    name: "DIFC",
    nameHe: "DIFC",
    nameAr: "مركز دبي المالي العالمي",
    landmarks: ["Gate Building", "ICD Brookfield Place", "DIFC Art Nights"],
    coordinates: { latitude: 25.2120, longitude: 55.2805 }
  },
  "jbr": {
    name: "JBR - Jumeirah Beach Residence",
    nameHe: "JBR - ג'ומיירה ביץ' רזידנס",
    nameAr: "جي بي آر - جميرا بيتش ريزيدنس",
    landmarks: ["The Walk", "JBR Beach", "Bluewaters Island"],
    coordinates: { latitude: 25.0780, longitude: 55.1340 }
  },
  "al-barsha": {
    name: "Al Barsha",
    nameHe: "אל ברשא",
    nameAr: "البرشاء",
    landmarks: ["Mall of the Emirates", "Ski Dubai"],
    coordinates: { latitude: 25.1175, longitude: 55.2006 }
  }
};

// ============================================================================
// CONTENT TYPE CONFIGURATIONS
// ============================================================================

const CONTENT_TYPE_CONFIG: Record<ContentType, {
  categories: ImageCategory[];
  promptStyle: string;
  altPrefix: { en: string; he: string; ar: string };
}> = {
  hotel: {
    categories: ["exterior", "lobby", "room", "suite", "pool", "spa", "dining", "view", "beach", "amenities"],
    promptStyle: "luxury hospitality photography, professional hotel photography, warm inviting atmosphere",
    altPrefix: { en: "", he: "", ar: "" }
  },
  attraction: {
    categories: ["exterior", "interior", "entrance", "exhibit", "view", "activity", "architecture", "night", "aerial"],
    promptStyle: "tourism photography, iconic landmark, stunning architecture, vibrant atmosphere",
    altPrefix: { en: "", he: "", ar: "" }
  },
  restaurant: {
    categories: ["exterior", "interior", "dish", "chef", "bar", "view", "dining"],
    promptStyle: "food photography, culinary art, elegant dining atmosphere, appetizing presentation",
    altPrefix: { en: "", he: "", ar: "" }
  },
  beach: {
    categories: ["panorama", "sunset", "activity", "aerial", "amenities"],
    promptStyle: "beach photography, crystal clear water, golden sand, tropical paradise vibes",
    altPrefix: { en: "", he: "", ar: "" }
  },
  district: {
    categories: ["panorama", "architecture", "night", "aerial", "activity", "sunset"],
    promptStyle: "cityscape photography, urban landscape, modern architecture, vibrant city life",
    altPrefix: { en: "", he: "", ar: "" }
  },
  event: {
    categories: ["crowd", "performance", "fireworks", "night", "activity"],
    promptStyle: "event photography, festive atmosphere, cultural celebration, vibrant colors",
    altPrefix: { en: "", he: "", ar: "" }
  },
  "real-estate": {
    categories: ["exterior", "interior", "living-room", "bedroom", "bathroom", "kitchen", "balcony", "view", "amenities", "pool"],
    promptStyle: "real estate photography, modern interior design, spacious rooms, premium finishes",
    altPrefix: { en: "", he: "", ar: "" }
  },
  article: {
    categories: ["hero", "featured", "content", "gallery"],
    promptStyle: "editorial photography, storytelling imagery, engaging visuals",
    altPrefix: { en: "", he: "", ar: "" }
  },
  itinerary: {
    categories: ["hero", "featured", "activity", "view"],
    promptStyle: "travel photography, adventure vibes, memorable experiences",
    altPrefix: { en: "", he: "", ar: "" }
  },
  transport: {
    categories: ["exterior", "interior", "activity"],
    promptStyle: "transportation photography, modern vehicles, comfortable journey",
    altPrefix: { en: "", he: "", ar: "" }
  }
};

// ============================================================================
// CATEGORY DESCRIPTIONS (for ALT text generation)
// ============================================================================

const CATEGORY_DESCRIPTIONS: Record<ImageCategory, {
  en: string;
  he: string;
  ar: string;
}> = {
  exterior: { en: "exterior view", he: "מבט חיצוני", ar: "منظر خارجي" },
  interior: { en: "interior", he: "פנים", ar: "داخلي" },
  lobby: { en: "lobby and reception area", he: "לובי ואזור קבלה", ar: "اللوبي ومنطقة الاستقبال" },
  room: { en: "guest room", he: "חדר אורחים", ar: "غرفة ضيوف" },
  suite: { en: "luxury suite", he: "סוויטת יוקרה", ar: "جناح فاخر" },
  pool: { en: "swimming pool", he: "בריכת שחייה", ar: "حمام سباحة" },
  spa: { en: "spa and wellness", he: "ספא ובריאות", ar: "سبا وعافية" },
  dining: { en: "dining area", he: "אזור אוכל", ar: "منطقة تناول الطعام" },
  view: { en: "scenic view", he: "נוף", ar: "منظر طبيعي" },
  beach: { en: "beach area", he: "אזור החוף", ar: "منطقة الشاطئ" },
  activity: { en: "activity", he: "פעילות", ar: "نشاط" },
  architecture: { en: "architecture", he: "אדריכלות", ar: "هندسة معمارية" },
  entrance: { en: "entrance", he: "כניסה", ar: "مدخل" },
  exhibit: { en: "exhibit", he: "תצוגה", ar: "معرض" },
  dish: { en: "signature dish", he: "מנה מיוחדת", ar: "طبق مميز" },
  chef: { en: "chef", he: "שף", ar: "شيف" },
  bar: { en: "bar area", he: "בר", ar: "بار" },
  balcony: { en: "balcony", he: "מרפסת", ar: "شرفة" },
  bedroom: { en: "bedroom", he: "חדר שינה", ar: "غرفة نوم" },
  bathroom: { en: "bathroom", he: "אמבטיה", ar: "حمام" },
  kitchen: { en: "kitchen", he: "מטבח", ar: "مطبخ" },
  "living-room": { en: "living room", he: "סלון", ar: "غرفة معيشة" },
  amenities: { en: "amenities", he: "מתקנים", ar: "مرافق" },
  panorama: { en: "panoramic view", he: "נוף פנורמי", ar: "منظر بانورامي" },
  sunset: { en: "at sunset", he: "בשקיעה", ar: "عند غروب الشمس" },
  night: { en: "at night", he: "בלילה", ar: "في الليل" },
  aerial: { en: "aerial view", he: "מבט אווירי", ar: "منظر جوي" },
  crowd: { en: "crowd and atmosphere", he: "קהל ואווירה", ar: "جمهور وأجواء" },
  performance: { en: "performance", he: "הופעה", ar: "عرض" },
  fireworks: { en: "fireworks display", he: "מופע זיקוקים", ar: "عرض ألعاب نارية" },
  hero: { en: "featured image", he: "תמונה ראשית", ar: "صورة مميزة" },
  featured: { en: "featured", he: "מומלץ", ar: "مميز" },
  gallery: { en: "gallery image", he: "תמונת גלריה", ar: "صورة معرض" },
  content: { en: "content image", he: "תמונת תוכן", ar: "صورة محتوى" }
};

// ============================================================================
// TIME OF DAY DESCRIPTIONS
// ============================================================================

const TIME_OF_DAY: Record<string, { en: string; he: string; ar: string }> = {
  day: { en: "during the day", he: "ביום", ar: "خلال النهار" },
  night: { en: "at night with city lights", he: "בלילה עם אורות העיר", ar: "في الليل مع أضواء المدينة" },
  sunset: { en: "at sunset with golden hour lighting", he: "בשקיעה עם תאורת שעת הזהב", ar: "عند غروب الشمس مع إضاءة الساعة الذهبية" },
  sunrise: { en: "at sunrise", he: "בזריחה", ar: "عند شروق الشمس" }
};

// ============================================================================
// MAIN SEO IMAGE SERVICE CLASS
// ============================================================================

export class ImageSEOService {
  private brandName = "TripMD";
  private baseUrl = "https://tripmd.com";

  /**
   * Generate complete SEO metadata for an image
   */
  generateSEOMetadata(context: ImageSEOContext, imageUrl: string, dimensions?: { width: number; height: number }): SEOImageMetadata {
    const filename = this.generateFilename(context);
    const alt = this.generateAltText(context);
    const title = this.generateTitle(context);
    const caption = this.generateCaption(context);
    const schema = this.generateSchema(context, imageUrl, dimensions);
    const aiPrompt = this.generateAIPrompt(context);
    const openGraph = this.generateOpenGraph(context, imageUrl, dimensions);

    return {
      filename,
      alt,
      title,
      caption,
      schema,
      aiPrompt,
      openGraph
    };
  }

  /**
   * Generate SEO-optimized filename
   * Format: [entity-slug]-[category]-[unique-feature]-[time]-[year].webp
   */
  generateFilename(context: ImageSEOContext): string {
    const parts: string[] = [];

    // Entity slug (e.g., "atlantis-the-palm")
    parts.push(this.slugify(context.entitySlug || context.entityName));

    // Location area
    if (context.location?.area) {
      parts.push(this.slugify(context.location.area));
    }

    // Category (e.g., "exterior", "pool")
    parts.push(context.category);

    // Unique feature if provided
    if (context.uniqueFeature) {
      parts.push(this.slugify(context.uniqueFeature));
    }

    // Time of day
    if (context.timeOfDay) {
      parts.push(context.timeOfDay);
    }

    // Year for time-sensitive content
    if (context.year) {
      parts.push(String(context.year));
    }

    return `${parts.join("-")}.webp`;
  }

  /**
   * Generate SEO-optimized ALT text in multiple languages
   */
  generateAltText(context: ImageSEOContext): { en: string; he: string; ar: string } {
    const categoryDesc = CATEGORY_DESCRIPTIONS[context.category];
    const areaInfo = DUBAI_AREAS[this.slugify(context.location?.area || "")];
    const timeDesc = context.timeOfDay ? TIME_OF_DAY[context.timeOfDay] : null;

    // English ALT
    let enAlt = `${context.entityName} ${categoryDesc.en}`;
    if (context.uniqueFeature) {
      enAlt += ` featuring ${context.uniqueFeature.replace(/-/g, " ")}`;
    }
    if (timeDesc) {
      enAlt += ` ${timeDesc.en}`;
    }
    if (areaInfo) {
      enAlt += ` in ${areaInfo.name}, Dubai`;
    } else if (context.location?.area) {
      enAlt += ` in ${context.location.area}, Dubai`;
    }

    // Hebrew ALT
    let heAlt = `${context.entityName} - ${categoryDesc.he}`;
    if (context.uniqueFeature) {
      heAlt += ` עם ${context.uniqueFeature.replace(/-/g, " ")}`;
    }
    if (timeDesc) {
      heAlt += ` ${timeDesc.he}`;
    }
    if (areaInfo) {
      heAlt += ` ב${areaInfo.nameHe}, דובאי`;
    }

    // Arabic ALT
    let arAlt = `${context.entityName} - ${categoryDesc.ar}`;
    if (context.uniqueFeature) {
      arAlt += ` مع ${context.uniqueFeature.replace(/-/g, " ")}`;
    }
    if (timeDesc) {
      arAlt += ` ${timeDesc.ar}`;
    }
    if (areaInfo) {
      arAlt += ` في ${areaInfo.nameAr}، دبي`;
    }

    return { en: enAlt, he: heAlt, ar: arAlt };
  }

  /**
   * Generate Title attribute (tooltip) with tips
   */
  generateTitle(context: ImageSEOContext): { en: string; he: string; ar: string } {
    const tip = this.generateTip(context);

    return {
      en: `${context.entityName} - ${tip.en} | ${this.brandName}`,
      he: `${context.entityName} - ${tip.he} | ${this.brandName}`,
      ar: `${context.entityName} - ${tip.ar} | ${this.brandName}`
    };
  }

  /**
   * Generate contextual tip based on content type
   */
  private generateTip(context: ImageSEOContext): { en: string; he: string; ar: string } {
    const tips: Record<ContentType, { en: string; he: string; ar: string }> = {
      hotel: {
        en: "Luxury accommodation in Dubai",
        he: "אירוח יוקרתי בדובאי",
        ar: "إقامة فاخرة في دبي"
      },
      attraction: {
        en: "Must-visit Dubai attraction",
        he: "אטרקציה חובה בדובאי",
        ar: "معلم سياحي لا بد من زيارته في دبي"
      },
      restaurant: {
        en: "Award-winning Dubai dining",
        he: "מסעדה מעטרת פרסים בדובאי",
        ar: "مطعم حائز على جوائز في دبي"
      },
      beach: {
        en: "Beautiful Dubai beach destination",
        he: "חוף יפהפה בדובאי",
        ar: "وجهة شاطئية جميلة في دبي"
      },
      district: {
        en: "Vibrant Dubai neighborhood",
        he: "שכונה תוססת בדובאי",
        ar: "حي نابض بالحياة في دبي"
      },
      event: {
        en: "Exciting Dubai event",
        he: "אירוע מרגש בדובאי",
        ar: "حدث مثير في دبي"
      },
      "real-estate": {
        en: "Premium Dubai property",
        he: "נכס פרימיום בדובאי",
        ar: "عقار فاخر في دبي"
      },
      article: {
        en: "Dubai travel guide",
        he: "מדריך טיולים לדובאי",
        ar: "دليل السفر إلى دبي"
      },
      itinerary: {
        en: "Perfect Dubai itinerary",
        he: "מסלול מושלם לדובאי",
        ar: "خط سير مثالي في دبي"
      },
      transport: {
        en: "Dubai transportation option",
        he: "אפשרות תחבורה בדובאי",
        ar: "خيار النقل في دبي"
      }
    };

    return tips[context.contentType] || tips.article;
  }

  /**
   * Generate Caption with entity linking
   */
  generateCaption(context: ImageSEOContext): { en: string; he: string; ar: string } {
    const entityUrl = `/${context.contentType}s/${context.entitySlug}`;
    const areaInfo = DUBAI_AREAS[this.slugify(context.location?.area || "")];
    const categoryDesc = CATEGORY_DESCRIPTIONS[context.category];

    // English caption with links
    let enCaption = `${categoryDesc.en.charAt(0).toUpperCase() + categoryDesc.en.slice(1)} of `;
    enCaption += `<a href="${entityUrl}">${context.entityName}</a>`;
    if (areaInfo) {
      enCaption += ` located in <a href="/areas/${this.slugify(context.location?.area || "")}">${areaInfo.name}</a>, Dubai.`;
    } else {
      enCaption += ` in Dubai.`;
    }
    if (context.uniqueFeature) {
      enCaption += ` Features ${context.uniqueFeature.replace(/-/g, " ")}.`;
    }

    // Hebrew caption
    let heCaption = `${categoryDesc.he} של `;
    heCaption += `<a href="${entityUrl}">${context.entityName}</a>`;
    if (areaInfo) {
      heCaption += ` ב<a href="/areas/${this.slugify(context.location?.area || "")}">${areaInfo.nameHe}</a>, דובאי.`;
    } else {
      heCaption += ` בדובאי.`;
    }

    // Arabic caption
    let arCaption = `${categoryDesc.ar} لـ `;
    arCaption += `<a href="${entityUrl}">${context.entityName}</a>`;
    if (areaInfo) {
      arCaption += ` في <a href="/areas/${this.slugify(context.location?.area || "")}">${areaInfo.nameAr}</a>، دبي.`;
    } else {
      arCaption += ` في دبي.`;
    }

    return { en: enCaption, he: heCaption, ar: arCaption };
  }

  /**
   * Generate Schema.org ImageObject markup
   */
  generateSchema(
    context: ImageSEOContext,
    imageUrl: string,
    dimensions?: { width: number; height: number }
  ): ImageObjectSchema {
    const alt = this.generateAltText(context);
    const areaInfo = DUBAI_AREAS[this.slugify(context.location?.area || "")];

    return {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      contentUrl: imageUrl.startsWith("http") ? imageUrl : `${this.baseUrl}${imageUrl}`,
      url: `${this.baseUrl}/${context.contentType}s/${context.entitySlug}`,
      name: `${context.entityName} ${CATEGORY_DESCRIPTIONS[context.category].en}`,
      description: alt.en,
      datePublished: new Date().toISOString().split("T")[0],
      author: {
        "@type": "Organization",
        name: this.brandName
      },
      contentLocation: {
        "@type": "Place",
        name: context.entityName,
        address: {
          "@type": "PostalAddress",
          // FAIL-FAST: Do not use implicit Dubai fallback for location - use context or omit
          addressLocality: areaInfo?.name || context.location?.area || context.entityName,
          addressRegion: context.location?.area || areaInfo?.name || undefined,
          addressCountry: context.location?.country || "AE"
        },
        // FAIL-FAST: Only include geo coordinates if explicitly provided - no implicit Dubai fallback
        ...(context.location?.coordinates || areaInfo?.coordinates ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: String(context.location?.coordinates?.latitude || areaInfo?.coordinates?.latitude),
            longitude: String(context.location?.coordinates?.longitude || areaInfo?.coordinates?.longitude)
          }
        } : {})
      },
      width: String(dimensions?.width || 1200),
      height: String(dimensions?.height || 800),
      encodingFormat: "image/webp"
    };
  }

  /**
   * Generate SEO-optimized AI image prompt
   */
  generateAIPrompt(context: ImageSEOContext): string {
    const config = CONTENT_TYPE_CONFIG[context.contentType];
    const areaInfo = DUBAI_AREAS[this.slugify(context.location?.area || "")];
    const categoryDesc = CATEGORY_DESCRIPTIONS[context.category];

    // Build the prompt
    const promptParts: string[] = [];

    // Main subject
    promptParts.push(`Professional ${categoryDesc.en} photograph of ${context.entityName}`);

    // Location context
    if (areaInfo) {
      promptParts.push(`located in ${areaInfo.name}, Dubai, UAE`);
      if (areaInfo.landmarks.length > 0) {
        promptParts.push(`near ${areaInfo.landmarks[0]}`);
      }
    } else if (context.location?.area) {
      promptParts.push(`in ${context.location.area}, Dubai, UAE`);
    }

    // Unique features
    if (context.uniqueFeature) {
      promptParts.push(`showcasing ${context.uniqueFeature.replace(/-/g, " ")}`);
    }

    // Time of day lighting
    if (context.timeOfDay) {
      const timeDescriptions: Record<string, string> = {
        day: "bright daylight with blue sky",
        night: "dramatic night lighting with city lights",
        sunset: "golden hour sunset lighting with warm orange and pink sky",
        sunrise: "soft sunrise lighting with pastel colors"
      };
      promptParts.push(timeDescriptions[context.timeOfDay] || "");
    }

    // Style based on content type
    promptParts.push(config.promptStyle);

    // Technical requirements
    promptParts.push("high resolution, 4K quality, sharp focus, professional composition");
    promptParts.push("realistic photography style, not AI-looking, natural colors");

    // Dubai specific elements
    promptParts.push("Middle Eastern luxury aesthetic, modern architecture, pristine condition");

    // Avoid problematic elements
    promptParts.push("no text, no watermarks, no logos, no people's faces clearly visible");

    return promptParts.filter(Boolean).join(", ");
  }

  /**
   * Generate OpenGraph image metadata
   */
  generateOpenGraph(
    context: ImageSEOContext,
    imageUrl: string,
    dimensions?: { width: number; height: number }
  ): OpenGraphImage {
    const alt = this.generateAltText(context);

    return {
      url: imageUrl.startsWith("http") ? imageUrl : `${this.baseUrl}${imageUrl}`,
      width: dimensions?.width || 1200,
      height: dimensions?.height || 630,
      alt: alt.en,
      type: "image/webp"
    };
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(baseUrl: string, filename: string): {
    mobile: string;
    tablet: string;
    desktop: string;
    sizes: string;
  } {
    const baseName = filename.replace(/\.[^.]+$/, "");
    const ext = "webp";

    return {
      mobile: `${baseUrl}/${baseName}-400w.${ext} 400w, ${baseUrl}/${baseName}-600w.${ext} 600w`,
      tablet: `${baseUrl}/${baseName}-800w.${ext} 800w, ${baseUrl}/${baseName}-1000w.${ext} 1000w`,
      desktop: `${baseUrl}/${baseName}-1200w.${ext} 1200w, ${baseUrl}/${baseName}-1600w.${ext} 1600w, ${baseUrl}/${baseName}-1920w.${ext} 1920w`,
      sizes: "(max-width: 767px) 100vw, (max-width: 1023px) 100vw, 100vw"
    };
  }

  /**
   * Generate complete HTML picture element
   */
  generatePictureHTML(
    context: ImageSEOContext,
    imageUrl: string,
    dimensions?: { width: number; height: number }
  ): string {
    const metadata = this.generateSEOMetadata(context, imageUrl, dimensions);
    const lang = context.language || "en";
    const alt = metadata.alt[lang];
    const title = metadata.title[lang];
    const isAboveFold = context.purpose === "hero";

    return `<picture>
  <source
    media="(max-width: 767px)"
    srcset="${imageUrl.replace(".webp", "-mobile.webp")}"
    type="image/webp">
  <source
    media="(max-width: 1023px)"
    srcset="${imageUrl.replace(".webp", "-tablet.webp")}"
    type="image/webp">
  <source
    media="(min-width: 1024px)"
    srcset="${imageUrl}"
    type="image/webp">
  <img
    src="${imageUrl.replace(".webp", ".jpg")}"
    alt="${alt}"
    title="${title}"
    width="${dimensions?.width || 1200}"
    height="${dimensions?.height || 800}"
    loading="${isAboveFold ? "eager" : "lazy"}"
    ${isAboveFold ? 'fetchpriority="high"' : ""}
    decoding="async">
</picture>`;
  }

  /**
   * Generate complete figure element with caption and Schema
   */
  generateFigureHTML(
    context: ImageSEOContext,
    imageUrl: string,
    dimensions?: { width: number; height: number }
  ): string {
    const metadata = this.generateSEOMetadata(context, imageUrl, dimensions);
    const lang = context.language || "en";
    const pictureHtml = this.generatePictureHTML(context, imageUrl, dimensions);
    const caption = metadata.caption[lang];
    const schema = JSON.stringify(metadata.schema, null, 2);

    return `<figure itemscope itemtype="https://schema.org/ImageObject">
  ${pictureHtml}
  <figcaption itemprop="caption">${caption}</figcaption>
  <script type="application/ld+json">
${schema}
  </script>
</figure>`;
  }

  /**
   * Utility: Slugify string
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}

// Singleton
let imageSEOServiceInstance: ImageSEOService | null = null;

export function getImageSEOService(): ImageSEOService {
  if (!imageSEOServiceInstance) {
    imageSEOServiceInstance = new ImageSEOService();
  }
  return imageSEOServiceInstance;
}

// Export convenience functions
export function generateImageSEOMetadata(
  context: ImageSEOContext,
  imageUrl: string,
  dimensions?: { width: number; height: number }
): SEOImageMetadata {
  return getImageSEOService().generateSEOMetadata(context, imageUrl, dimensions);
}

export function generateAIImagePrompt(context: ImageSEOContext): string {
  return getImageSEOService().generateAIPrompt(context);
}

export function generateImageFilename(context: ImageSEOContext): string {
  return getImageSEOService().generateFilename(context);
}
