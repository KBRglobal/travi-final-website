/**
 * Octypo Types - Core type definitions for the content generation system
 * Generic types for RSS/Article content generation (not attractions)
 */

// ============================================
// AGENT TYPES (Generic - Keep)
// ============================================

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
  type: "task" | "result" | "feedback" | "validation";
  content: any;
  timestamp: Date;
}

// ============================================
// CONTENT TYPES (Generic for Articles/RSS)
// ============================================

export type ContentType = "article" | "guide" | "news" | "itinerary" | "review" | "tips" | "event";

export type ContentSection =
  | "introduction"
  | "body"
  | "conclusion"
  | "faq"
  | "answerCapsule"
  | "metaTitle"
  | "metaDescription"
  | "whatToExpect"
  | "visitorTips"
  | "howToGetThere"
  | "honestLimitations"
  | "sensoryDescriptions";

export interface ContentSource {
  type: "rss" | "manual" | "topic-bank";
  feedId?: number;
  feedUrl?: string;
  originalTitle?: string;
  originalUrl?: string;
  publishedAt?: Date;
}

export interface ContentData {
  id: number | string;
  title: string;
  contentType: ContentType;
  destination?: string;
  category?: string;
  tags?: string[];
  source: ContentSource;
  summary?: string;
  keywords?: string[];
}

export interface WriterTask {
  contentId?: number | string;
  contentData?: ContentData;
  sections: ContentSection[];
  targetWordCount: number;
  locale: string;
  attractionData: AttractionData;
}

export interface ValidationTask {
  contentId: string;
  content: GeneratedContent;
  validationType: "fact" | "style" | "cultural" | "legal" | "safety" | "data";
}

export interface GeneratedContent {
  title: string;
  introduction: string;
  body: string;
  conclusion?: string;
  faqs: FAQ[];
  answerCapsule?: string;
  metaTitle: string;
  metaDescription: string;
  schemaPayload?: Record<string, any>;
  keywords?: string[];
  internalLinks?: Array<{ url: string; anchorText: string }>;
}

export interface FAQ {
  question: string;
  answer: string;
}

// ============================================
// VALIDATION TYPES (Generic - Keep)
// ============================================

export interface ValidationResult {
  validatorId: string;
  validatorName: string;
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  severity: "critical" | "major" | "minor";
  section: ContentSection | "overall";
  message: string;
  fix?: string;
}

// ============================================
// QUALITY SCORING (Generic - Keep)
// ============================================

export interface ContentQualityScore {
  seoScore: number;
  aeoScore: number;
  factCheckScore: number;
  styleScore: number;
  culturalScore?: number;
  overallScore: number;
  passed: boolean;
  validationResults: ValidationResult[];
  wordCounts: Record<ContentSection, number>;
  blueprintCompliance?: BlueprintCompliance;
}

export interface BlueprintCompliance {
  introductionWordCount: {
    actual: number;
    target: readonly [number, number] | [number, number];
    passed: boolean;
  };
  whatToExpectWordCount: {
    actual: number;
    target: readonly [number, number] | [number, number];
    passed: boolean;
  };
  visitorTipsWordCount: {
    actual: number;
    target: readonly [number, number] | [number, number];
    passed: boolean;
  };
  howToGetThereWordCount: {
    actual: number;
    target: readonly [number, number] | [number, number];
    passed: boolean;
  };
  faqCount: {
    actual: number;
    target: readonly [number, number] | [number, number];
    passed: boolean;
  };
  faqAnswerLengths: {
    actual: number[];
    target: readonly [number, number] | [number, number];
    allPassed: boolean;
  };
  metaTitleLength: {
    actual: number;
    target: readonly [number, number] | [number, number];
    passed: boolean;
  };
  metaDescriptionLength: {
    actual: number;
    target: readonly [number, number] | [number, number];
    passed: boolean;
  };
  sensoryDescriptionCount: {
    actual: number;
    target: number;
    passed: boolean;
  };
  honestLimitationCount: {
    actual: number;
    target: readonly [number, number] | [number, number];
    passed: boolean;
  };
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
  enableImageGeneration?: boolean;
}

// ============================================
// GENERATION RESULT (Generic)
// ============================================

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
  processedContent?: {
    introduction?: string;
    whatToExpect?: string;
    visitorTips?: string;
    howToGetThere?: string;
  };
  error?: string;
}

export interface GenerationResult {
  success: boolean;
  content?: GeneratedContent;
  qualityScore?: ContentQualityScore;
  quality108?: number | null;
  engineUsed: string;
  writerId: string;
  validationResults: ValidationResult[];
  retryCount: number;
  generationTimeMs: number;
  linkProcessorResult?: LinkProcessorResult;
  error?: string;
  errors?: string[];
}

// ============================================
// BLUEPRINT REQUIREMENTS (Generic)
// ============================================

export const BLUEPRINT_REQUIREMENTS = {
  introduction: { min: 150, max: 400 },
  body: { min: 400, max: 1500 },
  conclusion: { min: 100, max: 300 },
  answerCapsule: { min: 40, max: 60 },
  faq: {
    min: 4,
    max: 10,
    answerMin: 40,
    answerMax: 100,
  },
  metaTitle: { min: 40, max: 70 },
  metaDescription: { min: 130, max: 170 },
  totalArticle: { min: 800, max: 2500 },
  whatToExpect: { min: 100, max: 300, sensoryDescriptions: 3 },
  visitorTips: { min: 100, max: 300 },
  howToGetThere: { min: 100, max: 300 },
  honestLimitations: { min: 50, max: 200 },
  sensoryDescriptions: { min: 100, max: 300 },
} as const;

// ============================================
// QUALITY GRADING (Generic - Keep)
// ============================================

export const GRADE_THRESHOLDS = {
  "A+": 104,
  A: 98,
  "B+": 92,
  B: 86,
  FAIL: 0,
} as const;

export const QUALITY_CATEGORIES = {
  authenticity: { maxPoints: 6, weight: "core" },
  humanization: { maxPoints: 12, weight: "high" },
  engagement: { maxPoints: 12, weight: "high" },
  sources: { maxPoints: 10, weight: "medium" },
  depth: { maxPoints: 10, weight: "medium" },
  voice_tone: { maxPoints: 10, weight: "medium" },
  technical_seo: { maxPoints: 12, weight: "high" },
  aeo: { maxPoints: 8, weight: "medium" },
  paa: { maxPoints: 6, weight: "core" },
  completeness: { maxPoints: 12, weight: "high" },
  cultural_depth: { maxPoints: 10, weight: "medium" },
} as const;

export type QualityGrade = keyof typeof GRADE_THRESHOLDS;

export interface QualityCategoryResult {
  category: keyof typeof QUALITY_CATEGORIES;
  score: number;
  maxPoints: number;
  passed: boolean;
  issues: string[];
  details?: Record<string, any>;
}

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

// ============================================
// RSS SPECIFIC TYPES
// ============================================

export interface RSSFeedItem {
  id: string;
  feedId: number;
  title: string;
  link: string;
  description?: string;
  pubDate?: Date;
  author?: string;
  categories?: string[];
  content?: string;
  processed: boolean;
  processedAt?: Date;
}

export interface RSSGenerationJob {
  id: string;
  feedItemId: string;
  contentData: ContentData;
  status: "pending" | "processing" | "completed" | "failed";
  result?: GenerationResult;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// ============================================
// ATTRACTION TYPES (for attraction content generation)
// ============================================

export interface AttractionData {
  id: string | number;
  name: string;
  title?: string;
  slug: string;
  destination: string;
  cityName?: string;
  venueName?: string;
  category?: string;
  primaryCategory?: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  openingHours?: string;
  admissionFee?: string;
  priceFrom?: number;
  rating?: number;
  reviewCount?: number;
  bestTimeToVisit?: string;
  averageVisitDuration?: string;
  accessibility?: string;
  nearbyAttractions?: string[];
  tags?: string[];
}

export interface GeneratedAttractionContent extends GeneratedContent {
  whatToExpect?: string;
  visitorTips?: string;
  howToGetThere?: string;
  honestLimitations?: string;
  sensoryDescriptions?: string;
  bestTimeToVisit?: string;
  practicalInfo?: {
    openingHours?: string;
    admissionFee?: string;
    accessibility?: string;
  };
}
