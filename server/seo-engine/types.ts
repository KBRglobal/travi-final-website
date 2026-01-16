/**
 * SEO Engine Type Definitions
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface SEOEngineConfig {
  baseUrl: string;
  siteName: string;
  defaultLocale: string;
  supportedLocales: string[];
  enableAEO: boolean;
  enableReindexTriggers: boolean;
  enableBotMonitoring: boolean;
  minContentQualityScore: number;
  thinContentThreshold: number;
}

// ============================================================================
// Schema.org Types
// ============================================================================

export type SchemaType =
  | 'WebSite'
  | 'WebPage'
  | 'Article'
  | 'NewsArticle'
  | 'BlogPosting'
  | 'FAQPage'
  | 'HowTo'
  | 'Event'
  | 'Place'
  | 'TouristAttraction'
  | 'TouristDestination'
  | 'Hotel'
  | 'LodgingBusiness'
  | 'Restaurant'
  | 'FoodEstablishment'
  | 'LocalBusiness'
  | 'Organization'
  | 'BreadcrumbList'
  | 'ImageObject'
  | 'VideoObject'
  | 'ItemList'
  | 'Product'
  | 'Offer'
  | 'Review'
  | 'AggregateRating'
  | 'Person'
  | 'SpeakableSpecification';

export interface SchemaGraph {
  '@context': 'https://schema.org';
  '@graph': SchemaNode[];
}

export interface SchemaNode {
  '@type': SchemaType | SchemaType[];
  '@id'?: string;
  [key: string]: unknown;
}

export interface SchemaGenerationResult {
  schema: SchemaGraph;
  types: SchemaType[];
  validation: SchemaValidation;
  generatedAt: Date;
}

export interface SchemaValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// Canonical URL Types
// ============================================================================

export interface CanonicalConfig {
  contentId: string;
  locale?: string;
  includeLocalePrefix?: boolean;
  customPath?: string;
}

export interface CanonicalResult {
  canonical: string;
  alternates: AlternateLink[];
  isCanonicalContent: boolean;
  canonicalSource?: string;
}

export interface AlternateLink {
  hreflang: string;
  href: string;
}

// ============================================================================
// AEO Score Types
// ============================================================================

export interface AEOScoreResult {
  contentId: string;
  score: number;
  breakdown: AEOScoreBreakdown;
  recommendations: AEORecommendation[];
  lastCalculated: Date;
}

export interface AEOScoreBreakdown {
  answerCapsule: number;        // 0-25: Quality of answer capsule
  snippetReadiness: number;     // 0-20: How well content is formatted for snippets
  schemaCompleteness: number;   // 0-20: Schema.org coverage
  aiHeadings: number;           // 0-15: AI-friendly heading structure
  keyFactsPresence: number;     // 0-10: Quick facts/data points
  citability: number;           // 0-10: How likely to be cited by AI
}

export interface AEORecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: keyof AEOScoreBreakdown;
  message: string;
  action: string;
  potentialGain: number;
}

// ============================================================================
// Index Health Types
// ============================================================================

export interface IndexHealthSummary {
  totalContent: number;
  indexed: number;
  notIndexed: number;
  indexRate: number;
  issues: IndexIssue[];
  lastCrawl: Date | null;
  recommendations: string[];
}

export interface IndexIssue {
  type: IndexIssueType;
  severity: 'critical' | 'warning' | 'info';
  count: number;
  affectedContent: string[];
  description: string;
  fixAction: string;
}

export type IndexIssueType =
  | 'missing_meta_title'
  | 'missing_meta_description'
  | 'duplicate_title'
  | 'duplicate_description'
  | 'thin_content'
  | 'missing_canonical'
  | 'broken_canonical'
  | 'missing_schema'
  | 'invalid_schema'
  | 'no_internal_links'
  | 'orphan_page'
  | 'redirect_chain'
  | 'slow_response'
  | 'missing_alt_text'
  | 'missing_h1'
  | 'multiple_h1';

export interface IndexHealthDashboard {
  summary: IndexHealthSummary;
  byContentType: Record<string, ContentTypeHealth>;
  trends: IndexHealthTrend[];
  crawlerActivity: CrawlerActivitySummary;
}

export interface ContentTypeHealth {
  type: string;
  total: number;
  healthy: number;
  issues: number;
  averageScore: number;
}

export interface IndexHealthTrend {
  date: string;
  indexed: number;
  issues: number;
  score: number;
}

export interface CrawlerActivitySummary {
  lastDay: number;
  lastWeek: number;
  lastMonth: number;
  topCrawlers: Array<{ name: string; visits: number }>;
}

// ============================================================================
// Content Quality Types
// ============================================================================

export interface ContentQualityResult {
  contentId: string;
  score: number;
  wordCount: number;
  isThinContent: boolean;
  isZeroResult: boolean;
  issues: ContentQualityIssue[];
  suggestions: string[];
}

export interface ContentQualityIssue {
  type: ContentQualityIssueType;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  location?: string;
  autoFixable: boolean;
}

export type ContentQualityIssueType =
  | 'thin_content'
  | 'no_faq'
  | 'missing_answer_capsule'
  | 'no_images'
  | 'missing_alt_text'
  | 'missing_internal_links'
  | 'no_cta'
  | 'stale_content'
  | 'duplicate_content'
  | 'keyword_stuffing'
  | 'missing_h2_structure'
  | 'long_paragraphs'
  | 'no_quick_facts';

// ============================================================================
// Internal Linking Types
// ============================================================================

export interface InternalLinkAnalysis {
  contentId: string;
  outboundLinks: InternalLink[];
  inboundLinks: InternalLink[];
  suggestedLinks: SuggestedLink[];
  linkScore: number;
  isOrphan: boolean;
}

export interface InternalLink {
  sourceId: string;
  targetId: string;
  anchorText: string;
  context?: string;
  isAutoSuggested: boolean;
}

export interface SuggestedLink {
  targetId: string;
  targetTitle: string;
  targetType: string;
  relevanceScore: number;
  suggestedAnchor: string;
  reason: string;
}

// ============================================================================
// Re-index Types
// ============================================================================

export interface ReindexTrigger {
  contentId: string;
  reason: ReindexReason;
  priority: 'immediate' | 'high' | 'normal' | 'low';
  triggeredAt: Date;
  status: 'pending' | 'submitted' | 'completed' | 'failed';
  submittedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export type ReindexReason =
  | 'content_update'
  | 'schema_update'
  | 'canonical_change'
  | 'new_content'
  | 'stale_content'
  | 'error_fix'
  | 'manual_request'
  | 'bulk_update';

export interface ReindexStats {
  pending: number;
  submitted: number;
  completed: number;
  failed: number;
  lastSubmission: Date | null;
  dailyQuota: number;
  quotaUsed: number;
}

// ============================================================================
// Bot Monitor Types
// ============================================================================

export interface BotVisit {
  botName: string;
  botType: BotType;
  userAgent: string;
  requestPath: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  ipAddress?: string;
  contentId?: string;
}

export type BotType =
  | 'search_engine'
  | 'ai_crawler'
  | 'social_media'
  | 'seo_tool'
  | 'monitoring'
  | 'unknown';

export interface BotStats {
  totalVisits: number;
  byBot: Record<string, number>;
  byType: Record<BotType, number>;
  byPath: Array<{ path: string; count: number }>;
  byStatus: Record<number, number>;
  avgResponseTime: number;
  aiCrawlerShare: number;
  lastVisit: Date | null;
}

export interface BotBehaviorAlert {
  type: 'spike' | 'drop' | 'error_rate' | 'new_bot' | 'blocked';
  botName: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  details: Record<string, unknown>;
}

// ============================================================================
// Snippet Types
// ============================================================================

export interface SnippetReadiness {
  contentId: string;
  score: number;
  featuredSnippetReady: boolean;
  answerBoxReady: boolean;
  aiCitationReady: boolean;
  elements: SnippetElement[];
  recommendations: SnippetRecommendation[];
}

export interface SnippetElement {
  type: 'answer_capsule' | 'faq' | 'how_to' | 'quick_facts' | 'definition' | 'list' | 'table';
  present: boolean;
  quality: 'excellent' | 'good' | 'needs_improvement' | 'missing';
  content?: string;
}

export interface SnippetRecommendation {
  element: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  example?: string;
}

// ============================================================================
// Report Types
// ============================================================================

export interface ContentSEOReport {
  contentId: string;
  timestamp: Date;
  schema: SchemaGenerationResult;
  canonical: CanonicalResult;
  aeo: AEOScoreResult;
  quality: ContentQualityResult;
  internalLinks: InternalLinkAnalysis;
  snippetReadiness: SnippetReadiness;
  overallScore: number;
}

export interface SEOEngineStatus {
  isRunning: boolean;
  config: SEOEngineConfig;
  indexHealth: IndexHealthSummary;
  botActivity: BotStats;
  lastUpdated: Date;
}

// ============================================================================
// Content Types for SEO
// ============================================================================

export type ContentType =
  | 'attraction'
  | 'hotel'
  | 'article'
  | 'dining'
  | 'district'
  | 'transport'
  | 'event'
  | 'itinerary'
  | 'landing_page'
  | 'case_study'
  | 'off_plan';

export interface ContentForSEO {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  heroImage?: string;
  heroImageAlt?: string;
  blocks?: ContentBlock[];
  answerCapsule?: string;
  wordCount?: number;
  publishedAt?: Date;
  updatedAt?: Date;
}

export interface ContentBlock {
  type: string;
  data?: Record<string, unknown>;
  content?: string;
  level?: number;
}
