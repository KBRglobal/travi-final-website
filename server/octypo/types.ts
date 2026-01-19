/**
 * Octypo Types - Core type definitions for the content generation system
 * Ported from octypo-main Python patterns to TypeScript
 */

export interface AgentPersona {
  id: string;
  name: string;
  specialty: string;
  tone: string;
  expertise: string[];
  systemPrompt: string;
  preferredEngines: string[];
}

export interface AgentMessage {
  from: string;
  to: string;
  type: 'task' | 'result' | 'feedback' | 'validation';
  content: any;
  timestamp: Date;
}

export interface WriterTask {
  attractionId: number;
  attractionData: AttractionData;
  sections: ContentSection[];
  targetWordCount: number;
  locale: string;
}

export interface ValidationTask {
  contentId: string;
  content: GeneratedAttractionContent;
  validationType: 'fact' | 'style' | 'cultural' | 'legal' | 'safety' | 'data';
}

export interface AttractionData {
  id: number;
  title: string;
  cityName: string;
  venueName?: string;
  duration?: string;
  primaryCategory?: string;
  secondaryCategories?: string[];
  languages?: string[];
  wheelchairAccess?: boolean;
  tiqetsDescription?: string;
  tiqetsHighlights?: string[];
  priceFrom?: number;
  rating?: number;
  reviewCount?: number;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

export type ContentSection = 
  | 'introduction'
  | 'whatToExpect'
  | 'visitorTips'
  | 'howToGetThere'
  | 'faq'
  | 'answerCapsule'
  | 'metaTitle'
  | 'metaDescription';

export interface GeneratedAttractionContent {
  introduction: string;
  whatToExpect: string;
  visitorTips: string;
  howToGetThere: string;
  faqs: FAQ[];
  answerCapsule: string;
  metaTitle: string;
  metaDescription: string;
  schemaPayload: Record<string, any>;
  honestLimitations: string[];
  sensoryDescriptions: string[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ValidationResult {
  validatorId: string;
  validatorName: string;
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  severity: 'critical' | 'major' | 'minor';
  section: ContentSection | 'overall';
  message: string;
  fix?: string;
}

export interface ContentQualityScore {
  seoScore: number;
  aeoScore: number;
  factCheckScore: number;
  styleScore: number;
  culturalScore: number;
  overallScore: number;
  passed: boolean;
  validationResults: ValidationResult[];
  wordCounts: Record<ContentSection, number>;
  blueprintCompliance: BlueprintCompliance;
}

export interface BlueprintCompliance {
  introductionWordCount: { actual: number; target: [number, number]; passed: boolean };
  whatToExpectWordCount: { actual: number; target: [number, number]; passed: boolean };
  visitorTipsWordCount: { actual: number; target: [number, number]; passed: boolean };
  howToGetThereWordCount: { actual: number; target: [number, number]; passed: boolean };
  faqCount: { actual: number; target: [number, number]; passed: boolean };
  faqAnswerLengths: { actual: number[]; target: [number, number]; allPassed: boolean };
  metaTitleLength: { actual: number; target: [number, number]; passed: boolean };
  metaDescriptionLength: { actual: number; target: [number, number]; passed: boolean };
  sensoryDescriptionCount: { actual: number; target: number; passed: boolean };
  honestLimitationCount: { actual: number; target: [number, number]; passed: boolean };
}

export interface EngineCapability {
  narrative: boolean;
  factCheck: boolean;
  creative: boolean;
  analytical: boolean;
  cultural: boolean;
}

export interface OrchestratorConfig {
  maxRetries: number;
  qualityThreshold: number;
  parallelWriters: number;
  parallelValidators: number;
  enableImageGeneration: boolean;
}

export interface LinkProcessorResult {
  success: boolean;
  linksAdded: number;
  links: Array<{
    url: string;
    anchorText: string;
    relevanceScore: number;
    targetId: string;
    targetType: string;
  }>;
  processedSections: string[];
  processedContent: {
    introduction?: string;
    whatToExpect?: string;
    visitorTips?: string;
    howToGetThere?: string;
  };
  error?: string;
}

export interface GenerationResult {
  success: boolean;
  content?: GeneratedAttractionContent;
  qualityScore?: ContentQualityScore;
  quality108?: number | null; // 108-point quality score
  engineUsed: string;
  writerId: string;
  writerUsed?: string; // Alias for writerId
  validationResults: ValidationResult[];
  retryCount: number;
  generationTimeMs: number;
  processingTimeMs?: number; // Alias for generationTimeMs
  linkProcessorResult?: LinkProcessorResult;
  error?: string;
  errors?: string[]; // Multiple errors array
}

// Updated to match USER's 108-point scoring system
export const BLUEPRINT_REQUIREMENTS = {
  introduction: { min: 200, max: 450 },           // THROUGHPUT: 200-450 words (was 300)
  answerCapsule: { min: 40, max: 60 },            // Direct answer: 40-60 words
  h2Expanded: { min: 250, max: 500 },             // H2 sections: 250-500 words (was 300)
  fullSensoryScene: { min: 120, max: 250 },       // Sensory scene: 120-250 words (was 150)
  whatToExpect: { min: 300, max: 600, sensoryDescriptions: 4 }, // THROUGHPUT: 300-600 (was 400)
  visitorTips: { min: 250, max: 500 },            // THROUGHPUT: 250-500 (was 350)
  howToGetThere: { min: 150, max: 300 },          // THROUGHPUT: 150-300 (was 200)
  faq: { 
    min: 8, max: 15,                              // THROUGHPUT: 8-15 FAQs (was 10)
    answerMin: 40, answerMax: 80,                 // THROUGHPUT: 40-80 words (was 50)
    answerTarget: { min: 50, max: 75 }            // Ideal range
  },
  metaTitle: { min: 40, max: 70 },                // SEO: 40-70 chars
  metaDescription: { min: 130, max: 170 },        // SEO: 130-170 chars
  honestLimitations: { min: 2, max: 4 },          // 2-4 honest limitations
  totalArticle: { min: 900, max: 3000 },          // THROUGHPUT: 900-3000 - user approved lower threshold
  
  // Quantities for quality checks
  minH2Sections: 8,
  minQuotes: 8,
  targetQuotes: 10,
  minContractions: 15,
  minSensoryDetails: {
    sight: 5,
    sound: 4,
    smell: 4,
    taste: 3,
    touch: 4
  }
} as const;

// Grade thresholds (out of 108 points)
export const GRADE_THRESHOLDS = {
  'A+': 104,  // 96%+
  'A': 98,    // 91%+ (minimum passing)
  'B+': 92,   // 85%+
  'B': 86,    // 80%+
  'FAIL': 0   // Below 80%
} as const;

// 12 Quality Categories with point values (total: 108)
export const QUALITY_CATEGORIES = {
  travi_authenticity: { maxPoints: 6, weight: 'core' },
  humanization: { maxPoints: 12, weight: 'high' },
  sensory_immersion: { maxPoints: 12, weight: 'high' },
  quotes_sources: { maxPoints: 10, weight: 'medium' },
  cultural_depth: { maxPoints: 10, weight: 'medium' },
  engagement: { maxPoints: 10, weight: 'medium' },
  voice_tone: { maxPoints: 10, weight: 'medium' },
  technical_seo: { maxPoints: 12, weight: 'high' },
  aeo: { maxPoints: 8, weight: 'medium' },
  paa: { maxPoints: 6, weight: 'core' },
  completeness: { maxPoints: 12, weight: 'high' }
} as const;

export type QualityGrade = keyof typeof GRADE_THRESHOLDS;

// Quality check result for each category
export interface QualityCategoryResult {
  category: keyof typeof QUALITY_CATEGORIES;
  score: number;
  maxPoints: number;
  passed: boolean;
  issues: string[];
  details?: Record<string, any>;
}

// Full 108-point quality score
export interface Quality108Score {
  totalScore: number;
  maxScore: 108;
  percentage: number;
  grade: QualityGrade;
  passed: boolean;
  categories: Record<keyof typeof QUALITY_CATEGORIES, QualityCategoryResult>;
  criticalIssues: string[];
  majorIssues: string[];
  minorIssues: string[];
}
