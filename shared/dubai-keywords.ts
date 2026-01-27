// Dubai Tourism Keywords Database
// Adapted from imagebot for Travi CMS

export interface TopicKeyword {
  topic: string;
  keywords: string[];
  priority: 1 | 2 | 3;
}

export interface KeywordCategory {
  name: string;
  topics: TopicKeyword[];
}

export const DUBAI_KEYWORDS: Record<string, KeywordCategory> = {
  attractions: {
    name: "Attractions",
    topics: [
      {
        topic: "Burj Khalifa",
        keywords: ["burj khalifa", "at the top", "observation deck", "tallest building"],
        priority: 1,
      },
      {
        topic: "Dubai Mall",
        keywords: ["dubai mall", "shopping", "aquarium", "fountain"],
        priority: 1,
      },
      {
        topic: "Museum of the Future",
        keywords: ["museum of the future", "futuristic", "technology", "innovation"],
        priority: 1,
      },
      {
        topic: "Dubai Frame",
        keywords: ["dubai frame", "landmark", "observation", "photo spot"],
        priority: 2,
      },
      {
        topic: "Dubai Miracle Garden",
        keywords: ["miracle garden", "flowers", "floral", "garden"],
        priority: 2,
      },
      {
        topic: "Global Village",
        keywords: ["global village", "cultural", "entertainment", "festival"],
        priority: 2,
      },
      {
        topic: "Dubai Fountain",
        keywords: ["dubai fountain", "water show", "evening", "downtown"],
        priority: 1,
      },
      {
        topic: "Palm Jumeirah",
        keywords: ["palm jumeirah", "island", "luxury", "beach"],
        priority: 1,
      },
      {
        topic: "Atlantis The Palm",
        keywords: ["atlantis", "resort", "aquaventure", "waterpark"],
        priority: 1,
      },
      {
        topic: "Ain Dubai",
        keywords: ["ain dubai", "ferris wheel", "observation", "bluewaters"],
        priority: 2,
      },
      {
        topic: "Dubai Opera",
        keywords: ["dubai opera", "cultural", "performance", "downtown"],
        priority: 3,
      },
      {
        topic: "IMG Worlds of Adventure",
        keywords: ["img worlds", "theme park", "indoor", "adventure"],
        priority: 2,
      },
      {
        topic: "Legoland Dubai",
        keywords: ["legoland", "family", "kids", "theme park"],
        priority: 2,
      },
      {
        topic: "Wild Wadi",
        keywords: ["wild wadi", "waterpark", "family", "swimming"],
        priority: 3,
      },
    ],
  },
  hotels: {
    name: "Hotels & Resorts",
    topics: [
      {
        topic: "Burj Al Arab",
        keywords: ["burj al arab", "7 star", "luxury", "iconic"],
        priority: 1,
      },
      {
        topic: "Atlantis Resort",
        keywords: ["atlantis palm", "resort", "underwater", "luxury"],
        priority: 1,
      },
      {
        topic: "Dubai Marina Hotels",
        keywords: ["dubai marina", "waterfront", "skyline", "modern"],
        priority: 2,
      },
      {
        topic: "Downtown Dubai Hotels",
        keywords: ["downtown dubai", "city center", "burj khalifa view"],
        priority: 2,
      },
      {
        topic: "JBR Beach Hotels",
        keywords: ["jbr", "jumeirah beach", "beachfront", "walk"],
        priority: 2,
      },
      {
        topic: "Palm Jumeirah Resorts",
        keywords: ["palm jumeirah", "luxury resort", "beach villa"],
        priority: 1,
      },
      {
        topic: "Desert Resort",
        keywords: ["desert resort", "arabian", "luxury camp", "dunes"],
        priority: 2,
      },
      {
        topic: "Budget Hotels Dubai",
        keywords: ["budget", "affordable", "cheap hotels", "backpacker"],
        priority: 3,
      },
    ],
  },
  experiences: {
    name: "Experiences & Activities",
    topics: [
      {
        topic: "Desert Safari",
        keywords: ["desert safari", "dune bashing", "camel ride", "bbq dinner"],
        priority: 1,
      },
      {
        topic: "Dubai Beaches",
        keywords: ["beach", "jumeirah", "kite beach", "swimming"],
        priority: 1,
      },
      {
        topic: "Yacht Cruise",
        keywords: ["yacht", "cruise", "marina", "luxury boat"],
        priority: 2,
      },
      {
        topic: "Skydiving Dubai",
        keywords: ["skydive", "palm dropzone", "adventure", "extreme"],
        priority: 2,
      },
      {
        topic: "Hot Air Balloon",
        keywords: ["hot air balloon", "sunrise", "desert view", "flying"],
        priority: 2,
      },
      {
        topic: "Water Sports",
        keywords: ["jet ski", "parasailing", "flyboard", "water sports"],
        priority: 2,
      },
      {
        topic: "Dhow Cruise",
        keywords: ["dhow cruise", "dubai creek", "dinner cruise", "traditional"],
        priority: 2,
      },
      {
        topic: "Dubai Helicopter Tour",
        keywords: ["helicopter", "aerial view", "city tour", "scenic flight"],
        priority: 3,
      },
      {
        topic: "Scuba Diving",
        keywords: ["scuba diving", "underwater", "marine life", "diving"],
        priority: 3,
      },
    ],
  },
  dining: {
    name: "Restaurants & Dining",
    topics: [
      {
        topic: "Fine Dining Dubai",
        keywords: ["fine dining", "michelin", "gourmet", "luxury restaurant"],
        priority: 1,
      },
      {
        topic: "Rooftop Restaurants",
        keywords: ["rooftop", "skyline view", "evening dining", "atmosphere"],
        priority: 2,
      },
      {
        topic: "Arabic Cuisine",
        keywords: ["arabic food", "middle eastern", "traditional", "local cuisine"],
        priority: 2,
      },
      {
        topic: "Friday Brunch",
        keywords: ["friday brunch", "buffet", "champagne", "weekend"],
        priority: 2,
      },
      {
        topic: "Beachfront Dining",
        keywords: ["beach restaurant", "seafood", "sunset dining", "waterfront"],
        priority: 2,
      },
      {
        topic: "Street Food Dubai",
        keywords: ["street food", "cheap eats", "local food", "casual"],
        priority: 3,
      },
      {
        topic: "Dubai Marina Dining",
        keywords: ["marina restaurants", "waterfront dining", "promenade"],
        priority: 2,
      },
    ],
  },
  shopping: {
    name: "Shopping",
    topics: [
      {
        topic: "Dubai Mall Shopping",
        keywords: ["dubai mall", "luxury brands", "shopping destination"],
        priority: 1,
      },
      {
        topic: "Mall of Emirates",
        keywords: ["mall of emirates", "ski dubai", "shopping"],
        priority: 2,
      },
      {
        topic: "Gold Souk",
        keywords: ["gold souk", "traditional market", "jewelry", "gold"],
        priority: 1,
      },
      {
        topic: "Spice Souk",
        keywords: ["spice souk", "traditional", "aromatic", "local market"],
        priority: 2,
      },
      {
        topic: "Dubai Shopping Festival",
        keywords: ["shopping festival", "sales", "winter", "deals"],
        priority: 2,
      },
      {
        topic: "Outlet Shopping",
        keywords: ["outlet mall", "discount", "bargain", "deals"],
        priority: 3,
      },
    ],
  },
  culture: {
    name: "Culture & Heritage",
    topics: [
      {
        topic: "Al Fahidi Historic",
        keywords: ["al fahidi", "historic", "old dubai", "heritage"],
        priority: 2,
      },
      {
        topic: "Dubai Museum",
        keywords: ["dubai museum", "history", "culture", "traditional"],
        priority: 2,
      },
      {
        topic: "Jumeirah Mosque",
        keywords: ["jumeirah mosque", "islamic", "architecture", "religious"],
        priority: 2,
      },
      {
        topic: "Dubai Creek",
        keywords: ["dubai creek", "abra", "traditional", "old dubai"],
        priority: 2,
      },
      {
        topic: "Arabic Coffee Culture",
        keywords: ["arabic coffee", "traditional", "hospitality", "culture"],
        priority: 3,
      },
    ],
  },
  nightlife: {
    name: "Nightlife & Entertainment",
    topics: [
      { topic: "Dubai Nightclubs", keywords: ["nightclub", "party", "dj", "dancing"], priority: 2 },
      {
        topic: "Rooftop Bars",
        keywords: ["rooftop bar", "skyline", "cocktails", "evening"],
        priority: 2,
      },
      {
        topic: "Dubai Marina Nightlife",
        keywords: ["marina nightlife", "bars", "promenade", "evening"],
        priority: 2,
      },
      {
        topic: "Live Music Venues",
        keywords: ["live music", "concert", "entertainment", "performance"],
        priority: 3,
      },
    ],
  },
  family: {
    name: "Family & Kids",
    topics: [
      {
        topic: "Dubai Parks Resorts",
        keywords: ["dubai parks", "motiongate", "bollywood", "family"],
        priority: 2,
      },
      {
        topic: "KidZania Dubai",
        keywords: ["kidzania", "kids activities", "educational", "fun"],
        priority: 2,
      },
      {
        topic: "Aquarium Dubai Mall",
        keywords: ["aquarium", "underwater zoo", "marine life", "family"],
        priority: 1,
      },
      {
        topic: "Beach Activities Kids",
        keywords: ["family beach", "kids activities", "safe swimming", "family fun"],
        priority: 2,
      },
      {
        topic: "Dubai Dolphinarium",
        keywords: ["dolphinarium", "dolphins", "show", "family"],
        priority: 3,
      },
    ],
  },
  skyline: {
    name: "Skyline & Architecture",
    topics: [
      {
        topic: "Dubai Skyline",
        keywords: ["skyline", "cityscape", "modern", "skyscrapers"],
        priority: 1,
      },
      {
        topic: "Downtown Dubai",
        keywords: ["downtown", "city center", "burj khalifa", "urban"],
        priority: 1,
      },
      {
        topic: "Dubai Marina Skyline",
        keywords: ["marina skyline", "towers", "waterfront", "modern"],
        priority: 1,
      },
      {
        topic: "Business Bay",
        keywords: ["business bay", "canal", "modern architecture", "towers"],
        priority: 2,
      },
      {
        topic: "JLT Skyline",
        keywords: ["jlt", "jumeirah lake towers", "skyline", "business"],
        priority: 3,
      },
    ],
  },
  neighborhoodsNew: {
    name: "New Dubai Neighborhoods",
    topics: [
      {
        topic: "Downtown Dubai",
        keywords: ["downtown dubai", "burj khalifa", "city center", "luxury"],
        priority: 1,
      },
      {
        topic: "Dubai Marina",
        keywords: ["dubai marina", "waterfront", "towers", "promenade"],
        priority: 1,
      },
      {
        topic: "Jumeirah Beach Residence JBR",
        keywords: ["jbr", "beach", "walk", "beachfront"],
        priority: 1,
      },
      {
        topic: "Palm Jumeirah",
        keywords: ["palm jumeirah", "island", "luxury", "resort"],
        priority: 1,
      },
      {
        topic: "Business Bay",
        keywords: ["business bay", "canal", "modern", "skyline"],
        priority: 1,
      },
      { topic: "DIFC", keywords: ["difc", "financial", "art", "galleries"], priority: 1 },
      { topic: "City Walk", keywords: ["city walk", "shopping", "dining", "modern"], priority: 2 },
      {
        topic: "Bluewaters Island",
        keywords: ["bluewaters", "ain dubai", "island", "entertainment"],
        priority: 1,
      },
      { topic: "Jumeirah", keywords: ["jumeirah", "beach", "residential", "luxury"], priority: 1 },
      {
        topic: "Umm Suqeim",
        keywords: ["umm suqeim", "burj al arab", "beach", "residential"],
        priority: 2,
      },
      { topic: "La Mer", keywords: ["la mer", "beach", "entertainment", "dining"], priority: 1 },
      {
        topic: "Dubai Canal",
        keywords: ["dubai canal", "waterway", "promenade", "views"],
        priority: 2,
      },
      {
        topic: "Sheikh Zayed Road",
        keywords: ["sheikh zayed road", "highway", "skyscrapers", "iconic"],
        priority: 1,
      },
    ],
  },
  neighborhoodsOld: {
    name: "Old Dubai Neighborhoods",
    topics: [
      { topic: "Deira", keywords: ["deira", "traditional", "souks", "old dubai"], priority: 1 },
      { topic: "Al Rigga", keywords: ["al rigga", "metro", "shopping", "hotels"], priority: 2 },
      { topic: "Al Ras", keywords: ["al ras", "heritage", "creek", "traditional"], priority: 2 },
      { topic: "Naif", keywords: ["naif", "souk", "traditional", "market"], priority: 2 },
      {
        topic: "Gold Souk Area",
        keywords: ["gold souk", "jewelry", "traditional", "shopping"],
        priority: 1,
      },
      {
        topic: "Spice Souk Area",
        keywords: ["spice souk", "spices", "traditional", "aromatic"],
        priority: 1,
      },
      {
        topic: "Dubai Creek",
        keywords: ["dubai creek", "abra", "waterway", "historic"],
        priority: 1,
      },
      { topic: "Al Seef", keywords: ["al seef", "heritage", "creek", "waterfront"], priority: 1 },
      {
        topic: "Al Fahidi",
        keywords: ["al fahidi", "bastakiya", "historic", "heritage"],
        priority: 1,
      },
      {
        topic: "Al Shindagha",
        keywords: ["al shindagha", "museum", "heritage", "historic"],
        priority: 2,
      },
      {
        topic: "Bur Dubai",
        keywords: ["bur dubai", "creek", "heritage", "traditional"],
        priority: 1,
      },
      { topic: "Al Karama", keywords: ["karama", "shopping", "local", "markets"], priority: 2 },
    ],
  },
  offplan_real_estate: {
    name: "Off-Plan Real Estate",
    topics: [
      // Core Off-Plan Keywords
      {
        topic: "Off Plan Properties Dubai",
        keywords: [
          "off plan properties dubai",
          "off plan dubai",
          "dubai off plan",
          "new developments",
        ],
        priority: 1,
      },
      {
        topic: "Off Plan Villas Dubai",
        keywords: ["off plan villas dubai", "villa projects", "townhouse off plan"],
        priority: 1,
      },
      {
        topic: "Off Plan Apartments Dubai",
        keywords: ["off plan apartments dubai", "apartment projects", "residential units"],
        priority: 2,
      },
      {
        topic: "Payment Plans Dubai",
        keywords: ["payment plan", "installment plan", "post handover payment plan"],
        priority: 1,
      },
      // Top Developers
      {
        topic: "Emaar Properties",
        keywords: ["emaar", "emaar properties", "downtown developer", "dubai hills"],
        priority: 1,
      },
      {
        topic: "Damac Properties",
        keywords: ["damac", "damac properties", "luxury developer", "damac hills"],
        priority: 1,
      },
      {
        topic: "Nakheel",
        keywords: ["nakheel", "palm developer", "island projects", "waterfront"],
        priority: 2,
      },
      {
        topic: "Sobha Realty",
        keywords: ["sobha realty", "sobha hartland", "quality developer"],
        priority: 2,
      },
      // Prime Investment Areas
      {
        topic: "Dubai Hills Estate",
        keywords: ["dubai hills estate", "dubai hills", "golf course", "community"],
        priority: 1,
      },
      {
        topic: "Dubai Creek Harbour",
        keywords: ["dubai creek harbour", "creek tower", "waterfront", "emaar"],
        priority: 1,
      },
      {
        topic: "Mohammed bin Rashid City",
        keywords: ["mbr city", "meydan", "crystal lagoon", "luxury community"],
        priority: 2,
      },
      {
        topic: "JVC Off Plan",
        keywords: ["jumeirah village circle", "jvc", "affordable off plan", "family area"],
        priority: 2,
      },
      // Investment Essentials
      {
        topic: "Dubai Golden Visa",
        keywords: ["golden visa", "investment visa", "property visa", "residency"],
        priority: 1,
      },
      {
        topic: "Freehold Property Dubai",
        keywords: ["freehold", "foreign ownership", "freehold areas"],
        priority: 1,
      },
      {
        topic: "Rental Yield Dubai",
        keywords: ["rental yield", "roi", "guaranteed returns", "investment returns"],
        priority: 2,
      },
      {
        topic: "DLD Fees",
        keywords: ["dld fees", "registration fees", "transfer fees", "4 percent"],
        priority: 3,
      },
      // Property Types
      {
        topic: "Luxury Off Plan Dubai",
        keywords: ["luxury off plan dubai", "premium properties", "high-end", "ultra luxury"],
        priority: 1,
      },
      {
        topic: "Waterfront Properties Dubai",
        keywords: ["waterfront", "beach access", "sea view", "marina view"],
        priority: 2,
      },
      {
        topic: "Golf Course Properties",
        keywords: ["golf course view", "golf community", "emirates hills"],
        priority: 3,
      },
    ],
  },
};

export const IMAGE_TYPES = [
  { type: "hero", description: "Exterior/landscape shot for hero sections" },
  { type: "interior", description: "Interior or experience view" },
  { type: "activity", description: "People enjoying activities" },
  { type: "detail", description: "Close-up unique details" },
  { type: "practical", description: "Informational/practical view" },
];

export function getAllTopics(): TopicKeyword[] {
  const allTopics: TopicKeyword[] = [];
  for (const category of Object.values(DUBAI_KEYWORDS)) {
    allTopics.push(...category.topics);
  }
  return allTopics;
}

export function getTopicsByCategory(categoryKey: string): TopicKeyword[] {
  return DUBAI_KEYWORDS[categoryKey]?.topics || [];
}

export function searchTopics(query: string): TopicKeyword[] {
  const lowerQuery = query.toLowerCase();
  const results: TopicKeyword[] = [];

  for (const category of Object.values(DUBAI_KEYWORDS)) {
    for (const topic of category.topics) {
      if (
        topic.topic.toLowerCase().includes(lowerQuery) ||
        topic.keywords.some(k => k.includes(lowerQuery))
      ) {
        results.push(topic);
      }
    }
  }

  return results.sort((a, b) => a.priority - b.priority);
}

export function generateImagePrompt(topic: string, imageType: string): string {
  const basePrompts: Record<string, string> = {
    hero: `Professional tourism photograph of ${topic} in Dubai, UAE. Wide angle exterior shot, golden hour lighting, clear blue sky, ultra high quality, editorial photography style, single photograph not a collage.`,
    interior: `Professional interior photograph of ${topic} in Dubai, UAE. Well-lit indoor space, architectural details, luxury ambiance, high resolution, editorial style, single photograph.`,
    activity: `Professional travel photograph showing tourists enjoying ${topic} in Dubai, UAE. Candid moments, diverse people, vibrant atmosphere, natural lighting, single photograph.`,
    detail: `Close-up detail photograph of ${topic} in Dubai, UAE. Unique textures, interesting patterns, macro-style, artistic composition, high quality, single photograph.`,
    practical: `Informative photograph of ${topic} in Dubai, UAE. Clear signage visible, practical view for travelers, helpful context, daytime, single photograph.`,
  };

  return basePrompts[imageType] || basePrompts.hero;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function generateFilename(topic: string, imageType: string): string {
  const slug = slugify(topic);
  const timestamp = Date.now();
  return `${slug}-${imageType}-${timestamp}.jpg`;
}
