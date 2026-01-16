/**
 * Update 9987 - External Travel Data Integration
 * Integrates open data sources for destinations, POIs, and travel guides
 * 
 * Phase 2.3: Enhanced with 180M+ POIs, AI content tools, and quality systems:
 * 
 * Data Sources:
 * - Overture Maps: 64M+ POIs from Meta/Microsoft/Amazon/TomTom (placeholder - requires DuckDB)
 * - Foursquare OS Places: 100M+ POIs with Apache 2.0 license (placeholder - requires DuckDB)
 * - SLIPO: 18.5M+ OSM POIs in CSV format
 * - TourPedia: 500K POIs from Facebook/Foursquare/Google/Booking
 * - Wikivoyage POIs: 313K listings with addresses, phones, hours
 * - GeoNames: 11M+ geographic locations worldwide
 * - Public Holidays: 100+ countries via Nager.Date API
 * 
 * AI Content Tools:
 * - HallucinationDetector: Pattern-based uncertainty quantification for AI content
 * - SemanticImageSearch: CLIP-inspired text-to-image search using embeddings
 * - ContentParaphraser: Deterministic style transfer for SEO content variation
 * - ReadabilityAnalyzer: Flesch, Gunning Fog, SMOG, and other readability metrics
 * - ContentFeedbackCollector: Argilla-style human-in-the-loop feedback system
 * - PromptABTesting: Experiment framework for prompt optimization
 * 
 * Spatial features:
 * - pgvector for semantic search embeddings
 * - H3 hexagonal grid for geographic aggregation
 * - Supercluster for map marker clustering
 */

export const UPDATE_9987_CONFIG = {
  version: '9987.2.3',
  enabled: process.env.UPDATE_9987_ENABLED === 'true',
  sources: {
    countriesStatesCities: {
      name: 'dr5hn/countries-states-cities',
      url: 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json',
      priority: 1,
    },
    overtureMaps: {
      name: 'Overture Maps',
      description: '64M+ POIs from Meta, Microsoft, Amazon, TomTom',
      s3Bucket: 's3://overturemaps-us-west-2/release',
      priority: 2,
    },
    tourPedia: {
      name: 'TourPedia',
      apiUrl: 'http://tour-pedia.org/api',
      description: '500K POIs from Facebook, Foursquare, Google, Booking',
      priority: 3,
    },
    wikivoyagePois: {
      name: 'Wikivoyage POIs',
      url: 'https://raw.githubusercontent.com/baturin/wikivoyage-listings/master/listings.csv',
      description: '313K POIs with addresses, phones, hours',
      priority: 4,
    },
    geoNames: {
      name: 'GeoNames',
      url: 'https://download.geonames.org/export/dump',
      description: '11M+ geographic locations',
      priority: 5,
    },
    wikivoyageGuides: {
      name: 'Wikivoyage Guides',
      dumpUrl: 'https://dumps.wikimedia.org/enwikivoyage',
      description: 'Travel guides rewritten with AI',
      priority: 6,
    },
    openTripMap: {
      name: 'OpenTripMap',
      apiUrl: 'https://api.opentripmap.com/0.1',
      priority: 7,
    },
    slipo: {
      name: 'SLIPO OSM POIs',
      url: 'https://download.slipo.eu/results/osm-to-csv',
      description: '18.5M+ POIs from OpenStreetMap in CSV format',
      priority: 8,
    },
    foursquare: {
      name: 'Foursquare OS Places',
      url: 'https://opensource.foursquare.com/os-places',
      description: '100M+ global POIs with Apache 2.0 license',
      priority: 9,
    },
  },
  cheapModels: {
    primary: 'deepseek-chat', // DeepSeek V3 - $0.14/$0.28 per 1M tokens
    fallback: 'gemini-1.5-flash', // Gemini Flash - $0.075/$0.30 per 1M tokens
    budget: 'gpt-4o-mini', // GPT-4o mini - $0.15/$0.60 per 1M tokens
  },
  spatial: {
    h3Resolution: 9, // ~174m hexagon edge length - good for POI clustering
    embeddingModel: 'text-embedding-3-small', // OpenAI - 1536 dimensions
    embeddingDimensions: 1536,
  },
};

export function isUpdate9987Enabled(): boolean {
  return UPDATE_9987_CONFIG.enabled;
}

// Export ingesters
export { CountriesCitiesIngester } from './countries-cities-ingester';
export { WikivoyageGuideIngester } from './wikivoyage-guide-ingester';
export { OvertureIngester } from './overture-ingester';
export { TourpediaIngester } from './tourpedia-ingester';
export { WikivoyagePoiIngester } from './wikivoyage-poi-ingester';
export { GeonamesIngester } from './geonames-ingester';
export { SlipoIngester } from './slipo-ingester';
export { FoursquareIngester } from './foursquare-ingester';
export { PublicHolidaysIngester } from './public-holidays-ingester';

// AI Content Tools
export { 
  HallucinationDetector, 
  hallucinationDetector, 
  checkHallucinations,
  type HallucinationReport,
  type HallucinationClaim,
} from './hallucination-detector';

export { 
  SemanticImageSearch, 
  semanticImageSearch, 
  searchImages,
  indexImage,
  type ImageSearchResult,
  type ImageMetadata,
} from './semantic-image-search';

export { 
  ContentParaphraser, 
  contentParaphraser, 
  paraphrase,
  generateVariations,
  type ParaphraseResult,
  type ParaphraseStyle,
} from './content-paraphraser';

export { 
  ReadabilityAnalyzer, 
  readabilityAnalyzer, 
  analyzeReadability,
  checkTravelReadability,
  type ReadabilityMetrics,
} from './readability-analyzer';

export { 
  ContentFeedbackCollector, 
  contentFeedbackCollector, 
  submitFeedback,
  quickReview,
  getFeedbackStats,
  type FeedbackEntry,
  type FeedbackStats,
  type IssueLabel,
} from './content-feedback-collector';

export { 
  PromptABTesting, 
  promptABTesting, 
  createExperiment,
  getVariantForContent,
  recordExperimentResult,
  getExperimentSummary,
  type Experiment,
  type ExperimentSummary,
  type PromptVariant,
} from './prompt-ab-testing';
