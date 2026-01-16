/**
 * Query Expander
 * 
 * Handles deterministic query expansion for search intelligence:
 * - Synonym expansion (beach -> beaches, seaside, coast)
 * - City alias resolution (NYC -> New York, LA -> Los Angeles)
 * - Common misspelling correction
 * 
 * NO AI - purely static mappings for predictability
 */

/**
 * Common misspellings map
 * Maps misspelled terms to their correct form
 */
const COMMON_MISSPELLINGS: Record<string, string> = {
  // Destinations
  "dubei": "dubai",
  "duabi": "dubai",
  "duba": "dubai",
  "abudhabi": "abu dhabi",
  "abu-dhabi": "abu dhabi",
  "bankok": "bangkok",
  "bangok": "bangkok",
  "bangcock": "bangkok",
  "singapor": "singapore",
  "singapur": "singapore",
  "singapora": "singapore",
  "tokio": "tokyo",
  "toykyo": "tokyo",
  "tokayo": "tokyo",
  "istambul": "istanbul",
  "instanbul": "istanbul",
  "bareclona": "barcelona",
  "barcellona": "barcelona",
  "barcleona": "barcelona",
  "amstredam": "amsterdam",
  "amsterdem": "amsterdam",
  "amsterdan": "amsterdam",
  "londun": "london",
  "londone": "london",
  "parris": "paris",
  "pari": "paris",
  "roam": "rome",
  "roma": "rome",
  "newyork": "new york",
  "new-york": "new york",
  "hongkong": "hong kong",
  "hong-kong": "hong kong",
  "miame": "miami",
  "maiami": "miami",
  "lasvegas": "las vegas",
  "las-vegas": "las vegas",
  "losangeles": "los angeles",
  "los-angeles": "los angeles",
  // Common search terms
  "hotell": "hotel",
  "hotles": "hotels",
  "hotle": "hotel",
  "resturant": "restaurant",
  "restarant": "restaurant",
  "restraunt": "restaurant",
  "resteraunt": "restaurant",
  "restuarant": "restaurant",
  "atraction": "attraction",
  "atractions": "attractions",
  "atrractions": "attractions",
  "beech": "beach",
  "beache": "beach",
  "beeches": "beaches",
  "musem": "museum",
  "museuem": "museum",
  "musuem": "museum",
  "shoping": "shopping",
  "shoppping": "shopping",
  "nightlif": "nightlife",
  "nitelife": "nightlife",
  "luxary": "luxury",
  "luxery": "luxury",
  "luxurius": "luxurious",
  "romanic": "romantic",
  "romantik": "romantic",
  "adventur": "adventure",
  "buget": "budget",
  "budjet": "budget",
  "affrodable": "affordable",
  "afordable": "affordable",
  "accomodation": "accommodation",
  "acommodation": "accommodation",
  "accomodations": "accommodation",
};

const SYNONYM_MAP: Record<string, string[]> = {
  beach: ["beach", "beaches", "seaside", "coast", "shore", "coastal"],
  hotel: ["hotel", "hotels", "resort", "resorts", "lodging", "accommodation", "stay"],
  restaurant: ["restaurant", "restaurants", "dining", "eatery", "cafe", "bistro"],
  attraction: ["attraction", "attractions", "landmark", "landmarks", "sight", "sights", "poi"],
  shopping: ["shopping", "mall", "malls", "market", "markets", "bazaar", "souk"],
  nightlife: ["nightlife", "nightclub", "clubs", "bar", "bars", "lounge", "entertainment"],
  museum: ["museum", "museums", "gallery", "galleries", "art", "exhibition"],
  park: ["park", "parks", "garden", "gardens", "nature", "outdoor"],
  temple: ["temple", "temples", "shrine", "shrines", "mosque", "church", "cathedral"],
  food: ["food", "cuisine", "culinary", "gastronomy", "dining", "eat", "eating"],
  cheap: ["cheap", "budget", "affordable", "inexpensive", "low-cost", "value"],
  luxury: ["luxury", "luxurious", "premium", "upscale", "high-end", "exclusive", "5-star"],
  family: ["family", "families", "kids", "children", "child-friendly", "kid-friendly"],
  romantic: ["romantic", "romance", "couples", "honeymoon", "intimate"],
  adventure: ["adventure", "adventurous", "extreme", "thrilling", "outdoor", "hiking"],
  spa: ["spa", "wellness", "relaxation", "massage", "treatment", "retreat"],
  pool: ["pool", "swimming", "swim", "pools"],
  view: ["view", "views", "scenic", "panorama", "panoramic", "vista"],
  rooftop: ["rooftop", "rooftops", "terrace", "sky", "skyline"],
  tour: ["tour", "tours", "excursion", "excursions", "trip", "guided"],
  historic: ["historic", "historical", "heritage", "ancient", "old", "traditional"],
  modern: ["modern", "contemporary", "new", "trendy", "hip"],
  best: ["best", "top", "recommended", "popular", "famous", "must-see", "must-visit"],
  free: ["free", "complimentary", "no-cost", "gratis"],
  near: ["near", "nearby", "close", "around", "walking distance", "vicinity"],
  downtown: ["downtown", "central", "city center", "centre", "heart"],
};

const CITY_ALIASES: Record<string, string> = {
  "nyc": "new york",
  "ny": "new york",
  "new york city": "new york",
  "la": "los angeles",
  "lax": "los angeles",
  "sf": "san francisco",
  "frisco": "san francisco",
  "vegas": "las vegas",
  "lv": "las vegas",
  "dc": "washington dc",
  "philly": "philadelphia",
  "chi": "chicago",
  "miami beach": "miami",
  "bkk": "bangkok",
  "hk": "hong kong",
  "hkg": "hong kong",
  "sg": "singapore",
  "sin": "singapore",
  "ldn": "london",
  "uk": "london",
  "paris france": "paris",
  "rome italy": "rome",
  "bcn": "barcelona",
  "ams": "amsterdam",
  "dxb": "dubai",
  "uae": "dubai",
  "auh": "abu dhabi",
  "ist": "istanbul",
  "tyo": "tokyo",
  "jp": "tokyo",
  "japan": "tokyo",
};

const DESTINATION_KEYWORDS = new Set([
  "dubai", "abu dhabi", "london", "paris", "new york", "tokyo", "singapore",
  "hong kong", "bangkok", "istanbul", "barcelona", "amsterdam", "rome",
  "miami", "las vegas", "los angeles", "san francisco", "chicago",
]);

export interface QueryExpansion {
  original: string;
  expanded: string[];
  resolvedCity: string | null;
  synonymsApplied: string[];
}

/**
 * Correct common misspellings in a term
 */
export function correctMisspelling(term: string): string {
  const lower = term.toLowerCase();
  return COMMON_MISSPELLINGS[lower] || lower;
}

/**
 * Correct all misspellings in a query string
 */
export function correctQueryMisspellings(query: string): { corrected: string; corrections: string[] } {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const corrections: string[] = [];
  
  const correctedTokens = tokens.map(token => {
    const corrected = COMMON_MISSPELLINGS[token];
    if (corrected && corrected !== token) {
      corrections.push(`${token} → ${corrected}`);
      return corrected;
    }
    return token;
  });
  
  return {
    corrected: correctedTokens.join(" "),
    corrections,
  };
}

export function expandQuery(query: string): QueryExpansion {
  const original = query.trim().toLowerCase();
  
  // First, correct any misspellings
  const { corrected: correctedQuery, corrections } = correctQueryMisspellings(original);
  const tokens = correctedQuery.split(/\s+/).filter(Boolean);
  
  const expanded = new Set<string>();
  const synonymsApplied: string[] = [...corrections];
  let resolvedCity: string | null = null;

  // Check for city aliases in the corrected query
  for (const alias of Object.keys(CITY_ALIASES)) {
    if (correctedQuery.includes(alias)) {
      resolvedCity = CITY_ALIASES[alias];
      expanded.add(resolvedCity);
      break;
    }
  }

  for (const token of tokens) {
    expanded.add(token);
    
    // Check city aliases
    if (token in CITY_ALIASES) {
      const resolved = CITY_ALIASES[token];
      expanded.add(resolved);
      resolved.split(" ").forEach(t => expanded.add(t));
    }
    
    // Check synonyms
    if (token in SYNONYM_MAP) {
      const synonyms = SYNONYM_MAP[token];
      synonyms.forEach(syn => expanded.add(syn));
      synonymsApplied.push(token);
    }
  }

  return {
    original,
    expanded: Array.from(expanded),
    resolvedCity,
    synonymsApplied,
  };
}

export function isDestinationQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return Array.from(DESTINATION_KEYWORDS).some(dest => lower.includes(dest));
}

export function getSynonyms(term: string): string[] {
  const lower = term.toLowerCase();
  return SYNONYM_MAP[lower] || [lower];
}

export function resolveCityAlias(alias: string): string | null {
  const lower = alias.toLowerCase();
  return CITY_ALIASES[lower] || null;
}

export const queryExpander = {
  expandQuery,
  isDestinationQuery,
  getSynonyms,
  resolveCityAlias,
  correctMisspelling,
  correctQueryMisspellings,
  SYNONYM_MAP,
  CITY_ALIASES,
  COMMON_MISSPELLINGS,
};
