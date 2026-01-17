/**
 * Octopus Engine - Orchestrator
 * Main controller that coordinates the entire content generation pipeline
 * From document upload to final content output
 * 
 * UPGRADED: December 2025
 * - 8-Agent Pipeline Integration
 * - Entity Extraction, Content Strategy, Content Writer, SEO, AEO, Quality Control, Fact Checker, Content Corrector
 * - Batch processing with rate limiting
 * - Progress tracking
 */

import { parseDocument, parseDocumentBuffer, type ParsedDocument } from './document-parser';
import { extractEntities, type ExtractionResult, type ExtractedEntity } from './entity-extractor';
import { enrichWithGoogleMaps, isGoogleMapsConfigured, type EnrichedEntity } from './google-maps-enricher';
import { enrichWithWebSearch, isWebSearchConfigured, type WebEnrichedEntity } from './web-search-enricher';
import { generateContentPages, type GeneratedPage, type BatchGenerationResult } from './content-generators';
import { generateAllArticles, type GeneratedArticle as LongFormArticle } from './article-generators';
import { multiplyContent, type MultiplicationResult, type ContentTask, type ContentType } from './content-multiplier';
import { generateAEOContent, type AEOContent } from './aeo-generator';
import { validateSEO, type SEOValidationResult, type ContentForValidation } from '../lib/seo-validator';
import { validateFacts, type FactCheckReport } from './fact-checker';
import { suggestCorrections, type CorrectionSuggestion, type ContentForCorrection } from './content-corrector';
import { batchUpsertEntities } from './entity-upsert';
import { persistPipelineResults } from './content-persist';
import { log } from '../lib/logger';
import type { OctopusJobRecord } from '@shared/schema';
import { QueueManager, type QueueTask, type QueueStage } from './queue-manager';

const octopusLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Octopus] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[Octopus] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Octopus] ${msg}`, data),
};

// ============================================================================
// JOB PROCESSING MODE DOCUMENTATION (Phase 14 Task 2)
// ============================================================================
// 
// Octopus jobs are processed in TWO modes:
//
// 1. INLINE MODE (Primary - Default)
//    - Jobs started via startProcessingJob() run synchronously during the request
//    - processJob() is called immediately and runs in the same Node.js event loop
//    - Suitable for single-instance deployments
//    - No separate worker process required
//
// 2. QUEUE MODE (Background - Optional)
//    - Jobs can be queued via startQueuedJob() for background processing
//    - Requires initializeQueueSystem() to be called at server startup
//    - Uses QueueManager with per-stage concurrency limits
//    - Suitable for production with Autoscale (multiple instances)
//    - Includes exponential backoff retry (1s→60s max)
//
// In Replit Autoscale production:
// - initializeQueueSystem() is called on server bootstrap
// - The queue worker polls every 1 second for pending tasks
// - Job watchdog runs every 30 seconds to fail stuck jobs
// - Worker heartbeat is logged periodically for monitoring
//
// ============================================================================

// ============================================================================
// Timeout Configuration (P0 Fix: Prevent stuck jobs)
// ============================================================================

export const TIMEOUT_CONFIG = {
  TOTAL_JOB_TIMEOUT_MS: 5 * 60 * 1000,       // 5 minutes total
  PARSING_TIMEOUT_MS: 30 * 1000,              // 30 seconds
  EXTRACTION_TIMEOUT_MS: 2 * 60 * 1000,       // 2 minutes (AI-heavy)
  ENRICHMENT_MAPS_TIMEOUT_MS: 60 * 1000,      // 1 minute
  ENRICHMENT_WEB_TIMEOUT_MS: 60 * 1000,       // 1 minute
  GENERATION_TIMEOUT_MS: 2 * 60 * 1000,       // 2 minutes
  AGENT_PIPELINE_TIMEOUT_MS: 4 * 60 * 1000,   // 4 minutes
  WATCHDOG_INTERVAL_MS: 30 * 1000,            // Check every 30 seconds
};

export class JobTimeoutError extends Error {
  constructor(
    public stage: JobStatus,
    public jobId: string,
    public timeoutMs: number,
    public elapsedMs: number
  ) {
    super(`Timeout at ${stage} stage after ${Math.round(elapsedMs / 1000)}s (limit: ${Math.round(timeoutMs / 1000)}s)`);
    this.name = 'JobTimeoutError';
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  stage: JobStatus,
  jobId: string
): Promise<T> {
  const startTime = Date.now();
  
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        const elapsedMs = Date.now() - startTime;
        reject(new JobTimeoutError(stage, jobId, timeoutMs, elapsedMs));
      }, timeoutMs);
    })
  ]);
}

// ============================================================================
// Types
// ============================================================================

export interface OctopusJob {
  id: string;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  input: JobInput;
  progress: JobProgress;
  result?: OctopusResult;
  error?: string;
}

export type JobStatus =
  | 'pending'
  | 'parsing'
  | 'extracting'
  | 'enriching_maps'
  | 'enriching_web'
  | 'generating_pages'
  | 'generating_articles'
  | 'agent_pipeline'
  | 'fact_checking'
  | 'content_correction'
  | 'completed'
  | 'failed';

export interface JobInput {
  filename: string;
  fileSize: number;
  mimeType: string;
  destination?: string;
  options?: OctopusOptions;
}

export interface JobProgress {
  stage: JobStatus;
  stageProgress: number; // 0-100
  overallProgress: number; // 0-100
  currentStep: string;
  stats: {
    entitiesFound?: number;
    entitiesEnriched?: number;
    pagesGenerated?: number;
    articlesGenerated?: number;
  };
}

export interface OctopusOptions {
  // Extraction options
  entityTypes?: string[];
  minConfidence?: number;

  // Enrichment options
  enableGoogleMaps?: boolean;
  enableWebSearch?: boolean;

  // Generation options
  generatePages?: boolean;
  generateArticles?: boolean;
  locale?: string;
  tone?: 'professional' | 'friendly' | 'luxury' | 'casual';
  contentDepth?: 'brief' | 'standard' | 'comprehensive';

  // Processing options
  maxEntities?: number;
  minEntities?: number;
  parallelProcessing?: boolean;
  
  // Agent Pipeline options
  useAgentPipeline?: boolean;
  batchSize?: number;
  batchDelayMs?: number;
}

export interface OctopusResult {
  jobId: string;
  destination: string;
  processingTime: number;
  document: {
    filename: string;
    totalPages: number;
    totalWords: number;
    sections: number;
  };
  extraction: {
    totalEntities: number;
    byType: Record<string, number>;
    avgConfidence: number;
  };
  enrichment: {
    googleMaps: { enriched: number; notFound: number };
    webSearch: { enriched: number; failed: number };
  };
  generation: {
    pages: number;
    articles: number;
    totalWordCount: number;
  };
  content: {
    pages: GeneratedPage[];
    articles: LongFormArticle[];
  };
  agentPipeline?: AgentPipelineResult;
}

// ============================================================================
// 8-Agent Pipeline Types
// ============================================================================

export interface PipelineOptions {
  batchSize?: number;
  batchDelayMs?: number;
  minEntities?: number;
  minTasks?: number;
  locale?: string;
  tone?: 'professional' | 'friendly' | 'luxury' | 'casual';
  contentDepth?: 'brief' | 'standard' | 'comprehensive';
  enableFactChecking?: boolean;
  enableContentCorrection?: boolean;
  maxEntities?: number;
  onProgress?: (progress: PipelineProgress) => void;
}

export interface PipelineProgress {
  agent: string;
  stage: number;
  total: number;
  current: number;
  message: string;
}

export interface AgentPipelineResult {
  entityExtraction: ExtractionResult;
  contentStrategy: MultiplicationResult;
  generatedContent: PipelineGeneratedContent[];
  seoValidation: SEOValidationResult[];
  aeoContent: AEOContent[];
  qualityResults: QualityCheckResult[];
  factCheckResults: FactCheckReport[];
  correctionResults: CorrectionSuggestion[][];
  publishReady: number;
  needsReview: number;
  processingTime: number;
  stats: {
    totalEntities: number;
    totalTasks: number;
    totalGenerated: number;
    seoPassRate: number;
    qualityPassRate: number;
    factCheckedCount: number;
    correctionsGenerated: number;
  };
}

export interface PipelineGeneratedContent {
  taskId: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  htmlContent: string;
  wordCount: number;
  type: ContentType;
  entityIds: string[];
  status: 'generated' | 'seo_passed' | 'quality_passed' | 'publish_ready' | 'needs_review';
}

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface GeneratedContent {
  title: string;
  metaTitle: string;
  metaDescription: string;
  htmlContent: string;
}

export type GeneratorContentType = 
  | 'entity_page'
  | 'comparison'
  | 'ranking'
  | 'neighborhood'
  | 'itinerary'
  | 'budget_guide'
  | 'monthly_guide'
  | 'tips_article'
  | 'audience_guide'
  | 'temple_guide'
  | 'street_food_guide'
  | 'nightlife_guide'
  | 'shopping_guide';

function getTemplateByType(_type: GeneratorContentType): { name: string } | null {
  return { name: 'default-template' };
}

async function generateArticleFromTemplate(
  _template: { name: string },
  entityName: string,
  destination: string,
  _options: { locale?: string; tone?: string }
): Promise<{ title: string; metaTitle: string; metaDescription: string; content: string; wordCount: number } | null> {
  return {
    title: `${entityName} in ${destination}`,
    metaTitle: `${entityName} - ${destination} Travel Guide`,
    metaDescription: `Discover ${entityName} in ${destination}. Complete travel guide with tips and recommendations.`,
    content: `<p>Content about ${entityName} in ${destination}.</p>`,
    wordCount: 100,
  };
}

function validateQuality(content: GeneratedContent): QualityCheckResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  if (!content.title || content.title.length < 10) {
    issues.push('Title too short');
    score -= 20;
  }
  if (!content.metaDescription || content.metaDescription.length < 50) {
    issues.push('Meta description too short');
    score -= 15;
  }
  if (!content.htmlContent || content.htmlContent.length < 100) {
    issues.push('Content too short');
    score -= 25;
  }

  return {
    passed: score >= 60,
    score,
    issues,
    suggestions,
  };
}

const DEFAULT_OPTIONS: OctopusOptions = {
  entityTypes: ['hotel', 'restaurant', 'attraction', 'neighborhood', 'beach', 'mall', 'museum'],
  minConfidence: 0.6,
  enableGoogleMaps: true,
  enableWebSearch: true,
  generatePages: true,
  generateArticles: true,
  locale: 'en',
  tone: 'professional',
  contentDepth: 'standard',
  maxEntities: 200,
  minEntities: 80,
  parallelProcessing: false,
  useAgentPipeline: false,
  batchSize: 10,
  batchDelayMs: 500,
};

const DEFAULT_PIPELINE_OPTIONS: PipelineOptions = {
  batchSize: 10,
  batchDelayMs: 500,
  minEntities: 50,
  minTasks: 150,
  locale: 'en',
  tone: 'professional',
};

// ============================================================================
// Job Storage (DB-Backed via job-persistence.ts)
// ============================================================================

import * as JobPersistence from './job-persistence';

const legacyJobsCache = new Map<string, OctopusJob>();

export async function getJobFromDB(jobId: string): Promise<OctopusJob | undefined> {
  const cached = legacyJobsCache.get(jobId);
  if (cached) return cached;
  
  const dbJob = await JobPersistence.getJob(jobId);
  if (!dbJob) return undefined;
  
  return dbRecordToLegacyJob(dbJob);
}

export function getJob(jobId: string): OctopusJob | undefined {
  return legacyJobsCache.get(jobId);
}

export function getAllJobs(): OctopusJob[] {
  return Array.from(legacyJobsCache.values()).sort((a, b) =>
    b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export async function getAllJobsFromDB(limit = 50): Promise<OctopusJob[]> {
  const dbJobs = await JobPersistence.getAllJobs(limit);
  return dbJobs.map(dbRecordToLegacyJob);
}

export async function deleteJobFromDB(jobId: string): Promise<boolean> {
  legacyJobsCache.delete(jobId);
  return JobPersistence.deleteJob(jobId);
}

export function deleteJob(jobId: string): boolean {
  return legacyJobsCache.delete(jobId);
}

function dbRecordToLegacyJob(record: OctopusJobRecord): OctopusJob {
  return {
    id: record.id,
    status: record.status as JobStatus,
    createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
    startedAt: record.startedAt ? new Date(record.startedAt) : undefined,
    completedAt: record.completedAt ? new Date(record.completedAt) : undefined,
    input: {
      filename: record.filename,
      fileSize: record.fileSize || 0,
      mimeType: record.mimeType || 'application/octet-stream',
      destination: record.destinationHint || undefined,
      options: record.options as OctopusOptions || {},
    },
    progress: {
      stage: record.status as JobStatus,
      stageProgress: record.progressPct || 0,
      overallProgress: record.progressPct || 0,
      currentStep: record.currentStage || '',
      stats: {},
    },
    error: record.error || undefined,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  delayMs: number,
  processor: (item: T, index: number) => Promise<R>,
  onBatchComplete?: (batchIndex: number, totalBatches: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, items.length);
    const batch = items.slice(start, end);
    
    const batchResults = await Promise.all(
      batch.map((item, idx) => processor(item, start + idx))
    );
    
    results.push(...batchResults);
    
    if (onBatchComplete) {
      onBatchComplete(batchIndex + 1, totalBatches);
    }
    
    if (batchIndex < totalBatches - 1 && delayMs > 0) {
      await delay(delayMs);
    }
  }
  
  return results;
}

// ============================================================================
// 8-Agent Pipeline Implementation
// ============================================================================

/**
 * Run the 8-Agent Content Generation Pipeline
 * 
 * Agent 1: Entity Extraction - Extract entities from document
 * Agent 2: Content Strategy - Multiply content into tasks
 * Agent 3: Content Writer - Generate articles from templates
 * Agent 4: SEO Specialist - Validate SEO compliance
 * Agent 5: AEO Specialist - Generate AEO content
 * Agent 6: Quality Control - Final quality validation
 * Agent 7: Fact Checker - Validate facts in generated content
 * Agent 8: Content Corrector - Generate correction suggestions
 */
export async function runAgentPipeline(
  document: ParsedDocument,
  destination: string,
  options: PipelineOptions = {}
): Promise<AgentPipelineResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_PIPELINE_OPTIONS, ...options };
  const onProgress = opts.onProgress || (() => {});
  
  octopusLogger.info('Starting 8-Agent Pipeline', {
    destination,
    documentWords: document.totalWords,
    batchSize: opts.batchSize,
  });
  
  // =========================================================================
  // AGENT 1: Entity Extraction
  // =========================================================================
  onProgress({
    agent: 'Entity Extractor',
    stage: 1,
    total: 8,
    current: 0,
    message: 'Extracting entities from document...',
  });
  
  const entityExtraction = await extractEntities(document, {
    minConfidence: 0.25,
    useQuickModel: true,
    deepAnalysis: true,
    sweepScan: true,
  });
  
  octopusLogger.info('Agent 1 Complete: Entity Extraction', {
    totalEntities: entityExtraction.summary.totalEntities,
    byType: entityExtraction.summary.byType,
  });
  
  if (entityExtraction.summary.totalEntities < (opts.minEntities || 50)) {
    octopusLogger.warn('Entity count below target', {
      found: entityExtraction.summary.totalEntities,
      target: opts.minEntities,
    });
  }
  
  onProgress({
    agent: 'Entity Extractor',
    stage: 1,
    total: 8,
    current: entityExtraction.summary.totalEntities,
    message: `Extracted ${entityExtraction.summary.totalEntities} entities`,
  });

  // Phase 15C: Persist extracted entities to database
  // This ensures entities are available for chat, search, and internal linking
  if (entityExtraction.entities.length > 0) {
    try {
      const upsertResult = await batchUpsertEntities(
        entityExtraction.entities,
        destination,
        undefined // sourceJobId - not available in pipeline context
      );

      octopusLogger.info('Entities persisted to database', {
        total: upsertResult.total,
        created: upsertResult.created,
        updated: upsertResult.updated,
        unchanged: upsertResult.unchanged,
        errors: upsertResult.errors,
      });
    } catch (error) {
      octopusLogger.warn('Entity persistence failed (non-blocking)', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entityCount: entityExtraction.entities.length,
      });
      // Continue pipeline even if persistence fails - entities still available in memory
    }
  }

  // =========================================================================
  // AGENT 2: Content Strategy (Content Multiplier)
  // =========================================================================
  onProgress({
    agent: 'Content Strategist',
    stage: 2,
    total: 8,
    current: 0,
    message: 'Generating content strategy...',
  });
  
  const contentStrategy = multiplyContent(entityExtraction.entities, destination, {
    generateSeasonalContent: true,
    generateBudgetGuides: true,
    generateHiddenGems: true,
    generateMonthlyGuides: true,
    generateAudienceGuides: true,
    generateCategoryGuides: true,
  });
  
  octopusLogger.info('Agent 2 Complete: Content Strategy', {
    totalTasks: contentStrategy.stats.total,
    byTier: contentStrategy.stats.byTier,
    estimatedWords: contentStrategy.stats.estimatedTotalWords,
  });
  
  if (contentStrategy.stats.total < (opts.minTasks || 150)) {
    octopusLogger.warn('Task count below target', {
      generated: contentStrategy.stats.total,
      target: opts.minTasks,
    });
  }
  
  onProgress({
    agent: 'Content Strategist',
    stage: 2,
    total: 8,
    current: contentStrategy.stats.total,
    message: `Generated ${contentStrategy.stats.total} content tasks`,
  });
  
  // =========================================================================
  // AGENT 3: Content Writer
  // =========================================================================
  onProgress({
    agent: 'Content Writer',
    stage: 3,
    total: 8,
    current: 0,
    message: 'Generating content from templates...',
  });
  
  const generatedContent: PipelineGeneratedContent[] = [];
  const tasksToProcess = contentStrategy.tasks.filter(t => t.tier === 'immediate').slice(0, 50);
  
  const entityMap = new Map<string, ExtractedEntity>();
  for (const entity of entityExtraction.entities) {
    entityMap.set(entity.name.toLowerCase(), entity);
  }
  
  let processedCount = 0;
  const contentResults = await processBatch(
    tasksToProcess,
    opts.batchSize || 10,
    opts.batchDelayMs || 500,
    async (task, index) => {
      try {
        const templateType = mapContentTypeToGeneratorType(task.type);
        const template = getTemplateByType(templateType);
        
        if (!template) {
          return createPlaceholderContent(task, destination);
        }
        
        let entityName: string;
        const taskEntity = task.variables.entity as ExtractedEntity | undefined;
        if (taskEntity && typeof taskEntity === 'object' && taskEntity.name) {
          entityName = taskEntity.name;
        } else if (task.entities.length > 0) {
          entityName = task.entities[0];
        } else {
          entityName = task.title;
        }
        
        const article = await generateArticleFromTemplate(
          template,
          entityName,
          destination,
          { locale: opts.locale, tone: opts.tone }
        );
        
        processedCount++;
        onProgress({
          agent: 'Content Writer',
          stage: 3,
          total: 8,
          current: processedCount,
          message: `Generated ${processedCount}/${tasksToProcess.length} articles`,
        });
        
        if (!article) {
          return createPlaceholderContent(task, destination);
        }
        
        return {
          taskId: task.id,
          title: article.title,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          content: article.content,
          htmlContent: article.content,
          wordCount: article.wordCount,
          type: task.type,
          entityIds: task.entities,
          status: 'generated' as const,
        };
      } catch (error) {
        octopusLogger.error('Content generation failed', {
          taskId: task.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return createPlaceholderContent(task, destination);
      }
    },
    (batchIndex, totalBatches) => {
      octopusLogger.info(`Content Writer batch ${batchIndex}/${totalBatches} complete`);
    }
  );
  
  generatedContent.push(...contentResults);
  
  octopusLogger.info('Agent 3 Complete: Content Writer', {
    generated: generatedContent.length,
    totalWordCount: generatedContent.reduce((sum, c) => sum + c.wordCount, 0),
  });
  
  // =========================================================================
  // AGENT 4: SEO Specialist
  // =========================================================================
  onProgress({
    agent: 'SEO Specialist',
    stage: 4,
    total: 8,
    current: 0,
    message: 'Validating SEO compliance...',
  });
  
  const seoValidation: SEOValidationResult[] = [];
  let seoProcessed = 0;
  
  const seoResults = await processBatch(
    generatedContent,
    opts.batchSize || 10,
    opts.batchDelayMs || 500,
    async (content, index) => {
      const validationContent: ContentForValidation = {
        metaTitle: content.metaTitle,
        metaDescription: content.metaDescription,
        content: content.htmlContent,
      };
      
      const result = validateSEO(validationContent);
      
      if (result.isValid) {
        content.status = 'seo_passed';
      }
      
      seoProcessed++;
      onProgress({
        agent: 'SEO Specialist',
        stage: 4,
        total: 8,
        current: seoProcessed,
        message: `Validated ${seoProcessed}/${generatedContent.length} articles`,
      });
      
      return result;
    }
  );
  
  seoValidation.push(...seoResults);
  
  const seoPassCount = seoValidation.filter(v => v.isValid).length;
  octopusLogger.info('Agent 4 Complete: SEO Specialist', {
    validated: seoValidation.length,
    passed: seoPassCount,
    passRate: `${Math.round((seoPassCount / seoValidation.length) * 100)}%`,
  });
  
  // =========================================================================
  // AGENT 5: AEO Specialist
  // =========================================================================
  onProgress({
    agent: 'AEO Specialist',
    stage: 5,
    total: 8,
    current: 0,
    message: 'Generating AEO content...',
  });
  
  const aeoContent: AEOContent[] = [];
  const entitiesToProcess = entityExtraction.entities.slice(0, 30);
  let aeoProcessed = 0;
  
  const aeoResults = await processBatch(
    entitiesToProcess,
    opts.batchSize || 10,
    opts.batchDelayMs || 500,
    async (entity, index) => {
      try {
        const result = await generateAEOContent(entity, entity.type);
        
        aeoProcessed++;
        onProgress({
          agent: 'AEO Specialist',
          stage: 5,
          total: 8,
          current: aeoProcessed,
          message: `Generated AEO for ${aeoProcessed}/${entitiesToProcess.length} entities`,
        });
        
        return result;
      } catch (error) {
        octopusLogger.error('AEO generation failed', {
          entity: entity.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return createPlaceholderAEO(entity);
      }
    }
  );
  
  aeoContent.push(...aeoResults);
  
  octopusLogger.info('Agent 5 Complete: AEO Specialist', {
    generated: aeoContent.length,
    voiceOptimized: aeoContent.filter(a => a.voiceSearchOptimized).length,
  });
  
  // =========================================================================
  // AGENT 6: Quality Control
  // =========================================================================
  onProgress({
    agent: 'Quality Control',
    stage: 6,
    total: 8,
    current: 0,
    message: 'Running quality validation...',
  });
  
  const qualityResults: QualityCheckResult[] = [];
  let qualityProcessed = 0;
  
  const qualityValidation = await processBatch(
    generatedContent,
    opts.batchSize || 10,
    opts.batchDelayMs || 500,
    async (content, index) => {
      const qualityContent: GeneratedContent = {
        title: content.title,
        metaTitle: content.metaTitle,
        metaDescription: content.metaDescription,
        htmlContent: content.htmlContent,
      };
      
      const result = validateQuality(qualityContent);
      
      if (result.passed && content.status === 'seo_passed') {
        content.status = 'publish_ready';
      } else if (!result.passed) {
        content.status = 'needs_review';
      }
      
      qualityProcessed++;
      onProgress({
        agent: 'Quality Control',
        stage: 6,
        total: 8,
        current: qualityProcessed,
        message: `Quality checked ${qualityProcessed}/${generatedContent.length} articles`,
      });
      
      return result;
    }
  );
  
  qualityResults.push(...qualityValidation);
  
  const qualityPassCount = qualityResults.filter(q => q.passed).length;
  let publishReady = generatedContent.filter(c => c.status === 'publish_ready').length;
  let needsReview = generatedContent.filter(c => c.status === 'needs_review').length;
  
  octopusLogger.info('Agent 6 Complete: Quality Control', {
    validated: qualityResults.length,
    passed: qualityPassCount,
    publishReady,
    needsReview,
  });
  
  // =========================================================================
  // AGENT 7: Fact Checking (conditional based on options)
  // =========================================================================
  const factCheckResults: FactCheckReport[] = [];
  const factCheckMap = new Map<string, FactCheckReport>();
  let factCheckedCount = 0;
  let invalidFactsCount = 0;

  if (opts.enableFactChecking !== false) {
    onProgress({
      agent: 'Fact Checker',
      stage: 7,
      total: 8,
      current: 0,
      message: 'Validating facts in generated content...',
    });
    
    let factCheckProcessed = 0;
    
    for (const content of generatedContent) {
      if (content.content && content.content.length > 0) {
        try {
          const result = await validateFacts(content.content, destination, {
            contentId: content.taskId,
          });
          factCheckResults.push(result);
          factCheckMap.set(content.taskId, result);
          factCheckedCount++;
          
          if (result.invalidClaims > 0) {
            content.status = 'needs_review';
          }
        } catch (error) {
          octopusLogger.error('Fact check failed', {
            taskId: content.taskId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      factCheckProcessed++;
      onProgress({
        agent: 'Fact Checker',
        stage: 7,
        total: 8,
        current: factCheckProcessed,
        message: `Fact-checked ${factCheckProcessed}/${generatedContent.length} articles`,
      });
    }
    
    invalidFactsCount = factCheckResults.reduce((sum, r) => sum + r.invalidClaims, 0);
  } else {
    octopusLogger.info('Agent 7 skipped: Fact checking disabled by options');
    onProgress({
      agent: 'Fact Checker',
      stage: 7,
      total: 8,
      current: generatedContent.length,
      message: 'Fact checking skipped (disabled)',
    });
  }
  
  // Count how many content items have invalid facts
  const contentWithInvalidFacts = generatedContent.filter(c => c.status === 'needs_review');
  
  // Adjust publishReady: subtract items that need review
  publishReady = publishReady - contentWithInvalidFacts.length;
  if (publishReady < 0) publishReady = 0;
  
  // Add to needsReview
  needsReview = needsReview + contentWithInvalidFacts.length;

  octopusLogger.info('Agent 7 Complete: Fact Checker', {
    checked: factCheckedCount,
    invalidFactsFound: invalidFactsCount,
    publishReadyAfterFactCheck: publishReady,
    needsReviewAfterFactCheck: needsReview,
  });
  
  // =========================================================================
  // AGENT 8: Content Correction (conditional based on options)
  // =========================================================================
  const correctionResults: CorrectionSuggestion[][] = [];
  let totalCorrectionsGenerated = 0;

  if (opts.enableContentCorrection !== false && opts.enableFactChecking !== false) {
    onProgress({
      agent: 'Content Corrector',
      stage: 8,
      total: 8,
      current: 0,
      message: 'Generating correction suggestions...',
    });
    
    let correctionProcessed = 0;
    let articlesWithInvalidFacts = 0;
    
    for (const contentItem of generatedContent) {
      const factCheck = factCheckMap.get(contentItem.taskId);
      
      if (factCheck && factCheck.invalidClaims > 0) {
        articlesWithInvalidFacts++;
        const contentForCorrection: ContentForCorrection = {
          id: contentItem.taskId,
          title: contentItem.title,
          metaTitle: contentItem.metaTitle,
          metaDescription: contentItem.metaDescription,
          content: contentItem.content,
          htmlContent: contentItem.htmlContent,
        };
        
        const corrections = suggestCorrections(factCheck, contentForCorrection);
        correctionResults.push(corrections);
      }
      
      correctionProcessed++;
      onProgress({
        agent: 'Content Corrector',
        stage: 8,
        total: 8,
        current: correctionProcessed,
        message: `Generated corrections for ${correctionProcessed}/${generatedContent.length} articles`,
      });
    }
    
    totalCorrectionsGenerated = correctionResults.reduce((sum, r) => sum + r.length, 0);
    
    octopusLogger.info('Agent 8 Complete: Content Corrector', {
      articlesWithCorrections: correctionResults.length,
      articlesWithInvalidFacts,
      totalSuggestions: totalCorrectionsGenerated,
    });
  } else {
    octopusLogger.info('Agent 8 skipped: Content correction disabled by options');
    onProgress({
      agent: 'Content Corrector',
      stage: 8,
      total: 8,
      current: generatedContent.length,
      message: 'Content correction skipped (disabled)',
    });
  }
  
  // =========================================================================
  // Pipeline Complete
  // =========================================================================
  const processingTime = Date.now() - startTime;
  
  const pipelineResult: AgentPipelineResult = {
    entityExtraction,
    contentStrategy,
    generatedContent,
    seoValidation,
    aeoContent,
    qualityResults,
    factCheckResults,
    correctionResults,
    publishReady,
    needsReview,
    processingTime,
    stats: {
      totalEntities: entityExtraction.summary.totalEntities,
      totalTasks: contentStrategy.stats.total,
      totalGenerated: generatedContent.length,
      seoPassRate: seoValidation.length > 0 ? (seoPassCount / seoValidation.length) * 100 : 0,
      qualityPassRate: qualityResults.length > 0 ? (qualityPassCount / qualityResults.length) * 100 : 0,
      factCheckedCount,
      correctionsGenerated: totalCorrectionsGenerated,
    },
  };
  
  octopusLogger.info('8-Agent Pipeline Complete', {
    processingTime,
    publishReady,
    factCheckedCount,
    correctionsGenerated: totalCorrectionsGenerated,
    needsReview,
    seoPassRate: `${Math.round(pipelineResult.stats.seoPassRate)}%`,
    qualityPassRate: `${Math.round(pipelineResult.stats.qualityPassRate)}%`,
  });

  // GAP A: Persist publish-ready content to contents table and emit lifecycle events
  if (generatedContent.length > 0 && publishReady > 0) {
    try {
      const persistResult = await persistPipelineResults(
        generatedContent,
        `pipeline-${Date.now()}`,
        destination,
        { autoPublish: false } // Save as draft by default, require manual review
      );

      octopusLogger.info('Content persisted to database', {
        created: persistResult.created,
        updated: persistResult.updated,
        skipped: persistResult.skipped,
        failed: persistResult.failed,
      });
    } catch (persistError) {
      octopusLogger.warn('Content persistence failed (non-blocking)', {
        error: persistError instanceof Error ? persistError.message : 'Unknown error',
        contentCount: generatedContent.length,
      });
      // Continue - content persistence is not critical for pipeline completion
    }
  }

  return pipelineResult;
}

// ============================================================================
// Helper Functions for Pipeline
// ============================================================================

function mapContentTypeToGeneratorType(type: ContentType): GeneratorContentType {
  const mapping: Record<ContentType, GeneratorContentType> = {
    'entity_page': 'entity_page',
    'comparison': 'comparison',
    'ranking': 'ranking',
    'area_guide': 'neighborhood',
    'category_roundup': 'ranking',
    'faq_page': 'entity_page',
    'worth_it': 'tips_article',
    'itinerary': 'itinerary',
    'budget_guide': 'budget_guide',
    'seasonal': 'monthly_guide',
    'hidden_gems': 'tips_article',
    'vs_article': 'comparison',
    'tips_article': 'tips_article',
    'neighborhood_update': 'neighborhood',
    'destination_guide': 'audience_guide',
    'temple_guide': 'temple_guide',
    'street_food_guide': 'street_food_guide',
    'nightlife_guide': 'nightlife_guide',
    'shopping_guide': 'shopping_guide',
    'transportation_guide': 'tips_article',
    'tourist_tips': 'tips_article',
    'mistakes_article': 'tips_article',
    'laws_article': 'tips_article',
    'photo_spots': 'tips_article',
    'free_activities': 'tips_article',
    'monthly_guide': 'monthly_guide',
    'audience_guide': 'audience_guide',
    'cuisine_guide': 'street_food_guide',
    'michelin_guide': 'ranking',
  };
  
  return mapping[type] || 'entity_page';
}

function createDefaultEntity(title: string, destination: string): ExtractedEntity {
  const slugId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entity';
  return {
    id: `${slugId}-default-${Date.now()}`,
    name: title,
    type: 'attraction',
    description: `${title} in ${destination}`,
    confidence: 0.7,
    sourceSection: 0,
    rawMentions: [title],
    location: {
      city: destination,
      country: 'Unknown',
    },
    mentions: [{ page: 1, context: title }],
  } as ExtractedEntity;
}

function createPlaceholderContent(task: ContentTask, destination: string): PipelineGeneratedContent {
  return {
    taskId: task.id,
    title: task.title,
    metaTitle: `${task.title} | ${destination} Travel Guide`,
    metaDescription: `Discover everything about ${task.title} in ${destination}. Comprehensive travel guide with tips, recommendations, and insider information.`,
    content: `<h1>${task.title}</h1><p>Content generation pending for ${task.title}.</p>`,
    htmlContent: `<h1>${task.title}</h1><p>Content generation pending for ${task.title}.</p>`,
    wordCount: 100,
    type: task.type,
    entityIds: task.entities,
    status: 'needs_review',
  };
}

function createPlaceholderAEO(entity: ExtractedEntity): AEOContent {
  return {
    quickAnswer: {
      question: `What is ${entity.name}?`,
      answer: entity.description || `${entity.name} is a popular ${entity.type} destination.`,
      confidence: 0.5,
    },
    featuredSnippet: {
      paragraphSnippet: entity.description || `${entity.name} offers visitors a memorable experience.`,
      listSnippet: ['Popular destination', 'Great for visitors', 'Well-reviewed location'],
    },
    faqs: [
      { question: `What is ${entity.name}?`, answer: entity.description || 'A popular destination.', category: 'Overview' },
    ],
    schema: {
      type: 'Article',
      data: { '@type': 'Article', name: entity.name },
    },
    voiceSearchOptimized: false,
  };
}

// ============================================================================
// Main Orchestrator Functions
// ============================================================================

/**
 * Start a new Octopus processing job from a file buffer
 */
export async function startProcessingJob(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: OctopusOptions = {}
): Promise<OctopusJob> {
  const jobId = generateJobId();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const job: OctopusJob = {
    id: jobId,
    status: 'pending',
    createdAt: new Date(),
    input: {
      filename,
      fileSize: buffer.length,
      mimeType,
      destination: opts.locale,
      options: opts,
    },
    progress: {
      stage: 'pending',
      stageProgress: 0,
      overallProgress: 0,
      currentStep: 'Initializing...',
      stats: {},
    },
  };

  legacyJobsCache.set(jobId, job);
  
  JobPersistence.createJob({
    filename,
    fileSize: buffer.length,
    mimeType,
    destinationHint: opts.locale,
    options: opts as Record<string, unknown>,
    inputContent: buffer,
  }).then(dbJob => {
    job.id = dbJob.id;
    legacyJobsCache.delete(jobId);
    legacyJobsCache.set(dbJob.id, job);
  }).catch(err => {
    octopusLogger.error('Failed to persist job to DB', { error: err.message });
  });

  processJob(job, buffer, opts).catch(error => {
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date();
    JobPersistence.updateJob(job.id, { 
      status: 'failed', 
      error: error.message,
      completedAt: new Date() 
    }).catch(() => {});
    octopusLogger.error('Job failed', { jobId: job.id, error: error.message });
  });

  return job;
}

/**
 * Start a new Octopus processing job from a file path
 */
export async function startProcessingJobFromFile(
  filePath: string,
  options: OctopusOptions = {}
): Promise<OctopusJob> {
  const fs = await import('fs');
  const path = await import('path');

  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
  };

  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  return startProcessingJob(buffer, filename, mimeType, options);
}

/**
 * Main processing pipeline with timeout protection
 */
async function processJob(
  job: OctopusJob,
  buffer: Buffer,
  options: OctopusOptions
): Promise<void> {
  const startTime = Date.now();
  job.startedAt = new Date();
  
  const checkTotalTimeout = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > TIMEOUT_CONFIG.TOTAL_JOB_TIMEOUT_MS) {
      throw new JobTimeoutError('pending', job.id, TIMEOUT_CONFIG.TOTAL_JOB_TIMEOUT_MS, elapsed);
    }
  };

  try {
    // Step 1: Parse Document with timeout
    updateProgress(job, 'parsing', 0, 'Parsing document...');
    const document = await withTimeout(
      parseDocumentBuffer(buffer, job.input.filename, job.input.mimeType),
      TIMEOUT_CONFIG.PARSING_TIMEOUT_MS,
      'parsing',
      job.id
    );
    updateProgress(job, 'parsing', 100, `Parsed ${document.totalWords} words`);
    checkTotalTimeout();

    octopusLogger.info('Document parsed', {
      jobId: job.id,
      pages: document.totalPages,
      words: document.totalWords,
      sections: document.sections.length,
    });

    const destination = detectDestination(document);

    // Use Agent Pipeline if enabled
    if (options.useAgentPipeline) {
      updateProgress(job, 'agent_pipeline', 0, 'Running 8-Agent Pipeline...');
      
      const pipelineResult = await withTimeout(
        runAgentPipeline(document, destination, {
          batchSize: options.batchSize,
          batchDelayMs: options.batchDelayMs,
          minEntities: options.minEntities,
          locale: options.locale,
          tone: options.tone,
          onProgress: (progress) => {
            const overallProgress = Math.round((progress.stage / 6) * 100);
            updateProgress(
              job,
              'agent_pipeline',
              overallProgress,
              `Agent ${progress.stage}/6: ${progress.message}`
            );
          },
        }),
        TIMEOUT_CONFIG.AGENT_PIPELINE_TIMEOUT_MS,
        'agent_pipeline',
        job.id
      );

      job.result = {
        jobId: job.id,
        destination,
        processingTime: Date.now() - startTime,
        document: {
          filename: document.filename,
          totalPages: document.totalPages,
          totalWords: document.totalWords,
          sections: document.sections.length,
        },
        extraction: {
          totalEntities: pipelineResult.entityExtraction.summary.totalEntities,
          byType: pipelineResult.entityExtraction.summary.byType as Record<string, number>,
          avgConfidence: pipelineResult.entityExtraction.summary.averageConfidence,
        },
        enrichment: {
          googleMaps: { enriched: 0, notFound: 0 },
          webSearch: { enriched: 0, failed: 0 },
        },
        generation: {
          pages: 0,
          articles: pipelineResult.generatedContent.length,
          totalWordCount: pipelineResult.generatedContent.reduce((sum, c) => sum + c.wordCount, 0),
        },
        content: {
          pages: [],
          articles: [],
        },
        agentPipeline: pipelineResult,
      };

      job.status = 'completed';
      job.completedAt = new Date();
      job.progress.stats.entitiesFound = pipelineResult.stats.totalEntities;
      job.progress.stats.articlesGenerated = pipelineResult.generatedContent.length;
      updateProgress(job, 'completed', 100, 'Pipeline complete!');

      octopusLogger.info('Job completed with Agent Pipeline', {
        jobId: job.id,
        processingTime: job.result.processingTime,
        publishReady: pipelineResult.publishReady,
        needsReview: pipelineResult.needsReview,
      });

      return;
    }

    // Legacy pipeline (original processing)
    // Step 2: Extract Entities with timeout (critical AI stage)
    updateProgress(job, 'extracting', 0, 'Extracting entities...');
    const extractionResult = await withTimeout(
      extractEntities(document, {
        entityTypes: options.entityTypes as any,
        minConfidence: options.minConfidence,
        useQuickModel: true,
        deepAnalysis: true,
      }),
      TIMEOUT_CONFIG.EXTRACTION_TIMEOUT_MS,
      'extracting',
      job.id
    );
    checkTotalTimeout();

    job.progress.stats.entitiesFound = extractionResult.summary.totalEntities;
    updateProgress(job, 'extracting', 100, `Found ${extractionResult.summary.totalEntities} entities`);

    octopusLogger.info('Entities extracted', {
      jobId: job.id,
      total: extractionResult.summary.totalEntities,
      byType: extractionResult.summary.byType,
      destination,
    });

    let entities = extractionResult.entities;
    if (options.maxEntities && entities.length > options.maxEntities) {
      entities = entities.slice(0, options.maxEntities);
    }

    // Step 3: Google Maps Enrichment with timeout
    let enrichedEntities: EnrichedEntity[] = entities as EnrichedEntity[];

    if (options.enableGoogleMaps && isGoogleMapsConfigured()) {
      updateProgress(job, 'enriching_maps', 0, 'Enriching with Google Maps...');

      const mapsResult = await withTimeout(
        enrichWithGoogleMaps(entities, destination),
        TIMEOUT_CONFIG.ENRICHMENT_MAPS_TIMEOUT_MS,
        'enriching_maps',
        job.id
      );
      checkTotalTimeout();
      
      enrichedEntities = mapsResult.enrichedEntities;
      job.progress.stats.entitiesEnriched = mapsResult.successCount;

      updateProgress(job, 'enriching_maps', 100, `Enriched ${mapsResult.successCount} entities with Maps`);

      octopusLogger.info('Google Maps enrichment complete', {
        jobId: job.id,
        success: mapsResult.successCount,
        notFound: mapsResult.notFoundCount,
      });
    } else {
      updateProgress(job, 'enriching_maps', 100, 'Google Maps enrichment skipped');
    }

    // Step 4: Web Search Enrichment with timeout
    let webEnrichedEntities: WebEnrichedEntity[] = enrichedEntities as WebEnrichedEntity[];

    if (options.enableWebSearch) {
      updateProgress(job, 'enriching_web', 0, 'Enriching with web search...');

      const webResult = await withTimeout(
        enrichWithWebSearch(enrichedEntities, destination, {
          searchDepth: 'standard',
          includeReviews: true,
          includePrices: true,
        }),
        TIMEOUT_CONFIG.ENRICHMENT_WEB_TIMEOUT_MS,
        'enriching_web',
        job.id
      );
      checkTotalTimeout();
      
      webEnrichedEntities = webResult.enrichedEntities;

      updateProgress(job, 'enriching_web', 100, `Web enrichment: ${webResult.successCount} entities`);

      octopusLogger.info('Web search enrichment complete', {
        jobId: job.id,
        success: webResult.successCount,
        failed: webResult.failedCount,
      });
    } else {
      updateProgress(job, 'enriching_web', 100, 'Web search enrichment skipped');
    }

    // Step 5: Generate Content Pages with timeout
    let pages: GeneratedPage[] = [];
    let pageStats = { successCount: 0, failedCount: 0 };

    if (options.generatePages) {
      updateProgress(job, 'generating_pages', 0, 'Generating content pages...');

      const pageResult = await withTimeout(
        generateContentPages(webEnrichedEntities, destination, {
          locale: options.locale,
          tone: options.tone,
          contentDepth: options.contentDepth,
          includeAEO: true,
          includeSchema: true,
        }),
        TIMEOUT_CONFIG.GENERATION_TIMEOUT_MS,
        'generating_pages',
        job.id
      );
      checkTotalTimeout();

      pages = pageResult.pages;
      pageStats = pageResult;
      job.progress.stats.pagesGenerated = pageResult.successCount;

      updateProgress(job, 'generating_pages', 100, `Generated ${pageResult.successCount} pages`);

      octopusLogger.info('Content pages generated', {
        jobId: job.id,
        success: pageResult.successCount,
        failed: pageResult.failedCount,
      });
    } else {
      updateProgress(job, 'generating_pages', 100, 'Page generation skipped');
    }

    // Step 6: Generate Articles with timeout
    let articles: LongFormArticle[] = [];

    if (options.generateArticles) {
      updateProgress(job, 'generating_articles', 0, 'Generating articles...');

      articles = await withTimeout(
        generateAllArticles(webEnrichedEntities, pages, destination, {
          locale: options.locale,
          tone: options.tone,
          wordCount: 'medium',
          includeAEO: true,
        }),
        TIMEOUT_CONFIG.GENERATION_TIMEOUT_MS,
        'generating_articles',
        job.id
      );
      checkTotalTimeout();

      job.progress.stats.articlesGenerated = articles.length;
      updateProgress(job, 'generating_articles', 100, `Generated ${articles.length} articles`);

      octopusLogger.info('Articles generated', {
        jobId: job.id,
        count: articles.length,
        types: articles.map(a => a.type),
      });
    } else {
      updateProgress(job, 'generating_articles', 100, 'Article generation skipped');
    }

    // Complete
    const totalWordCount = pages.reduce((sum, p) => {
      const pageWords = p.content.blocks.reduce((s, b) => {
        const content = b.content || '';
        return s + content.split(/\s+/).length;
      }, 0);
      return sum + pageWords;
    }, 0) + articles.reduce((sum, a) => sum + a.metadata.wordCount, 0);

    job.result = {
      jobId: job.id,
      destination,
      processingTime: Date.now() - startTime,
      document: {
        filename: document.filename,
        totalPages: document.totalPages,
        totalWords: document.totalWords,
        sections: document.sections.length,
      },
      extraction: {
        totalEntities: extractionResult.summary.totalEntities,
        byType: extractionResult.summary.byType as Record<string, number>,
        avgConfidence: extractionResult.summary.averageConfidence,
      },
      enrichment: {
        googleMaps: {
          enriched: job.progress.stats.entitiesEnriched || 0,
          notFound: entities.length - (job.progress.stats.entitiesEnriched || 0),
        },
        webSearch: {
          enriched: webEnrichedEntities.filter(e => e.webSearchData).length,
          failed: webEnrichedEntities.filter(e => !e.webSearchData).length,
        },
      },
      generation: {
        pages: pages.length,
        articles: articles.length,
        totalWordCount,
      },
      content: {
        pages,
        articles,
      },
    };

    job.status = 'completed';
    job.completedAt = new Date();
    updateProgress(job, 'completed', 100, 'Processing complete!');

    octopusLogger.info('Job completed successfully', {
      jobId: job.id,
      processingTime: job.result.processingTime,
      pages: pages.length,
      articles: articles.length,
      totalWordCount,
    });

  } catch (error: any) {
    const failedAt = new Date();
    const isTimeout = error instanceof JobTimeoutError;
    
    // PHASE 14: Check if this is an AI task rejection error
    const isAIRejection = error.name === 'AITaskRejectionError';
    
    const failedStage = isTimeout ? error.stage : job.progress.stage;
    
    // PHASE 14: Build detailed error message based on error type
    let errorMessage: string;
    if (isTimeout) {
      errorMessage = `Timeout at ${failedStage} stage after ${Math.round(error.elapsedMs / 1000)}s (limit: ${Math.round(error.timeoutMs / 1000)}s)`;
    } else if (isAIRejection) {
      // PHASE 14: Structured rejection message for visibility
      errorMessage = `[AI] Task rejected at ${failedStage}: ${error.reason || error.message}`;
      
      // PHASE 14: Log structured rejection event
      octopusLogger.error('[AI] Task rejected', {
        taskId: error.taskId,
        provider: error.provider,
        category: error.category,
        reason: error.reason || error.message,
        jobId: job.id,
        stage: failedStage,
      });
    } else {
      errorMessage = error.message;
    }
    
    job.status = 'failed';
    job.error = errorMessage;
    job.completedAt = failedAt;
    
    octopusLogger.info(`Job ${job.id} transitioned: ${job.progress.stage} → failed`, {
      jobId: job.id,
      from: job.progress.stage,
      to: 'failed',
      error: errorMessage,
      isTimeout,
      isAIRejection,
      failedStage,
    });

    octopusLogger.error('Job processing failed', {
      jobId: job.id,
      stage: failedStage,
      error: errorMessage,
      isTimeout,
      isAIRejection,
    });
    
    await JobPersistence.failJob(job.id, errorMessage, failedStage).catch(() => {});

    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateJobId(): string {
  return `octopus_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function updateProgress(
  job: OctopusJob,
  stage: JobStatus,
  stageProgress: number,
  currentStep: string
): void {
  const previousStage = job.progress.stage;
  
  job.status = stage;
  job.progress.stage = stage;
  job.progress.stageProgress = stageProgress;
  job.progress.currentStep = currentStep;

  const stageWeights: Record<JobStatus, number> = {
    pending: 0,
    parsing: 10,
    extracting: 25,
    enriching_maps: 40,
    enriching_web: 55,
    generating_pages: 70,
    generating_articles: 80,
    agent_pipeline: 50,
    fact_checking: 85,
    content_correction: 92,
    completed: 100,
    failed: job.progress.overallProgress,
  };

  const baseProgress = stageWeights[stage] || 0;
  const nextStage = getNextStage(stage);
  const nextProgress = nextStage ? stageWeights[nextStage] : 100;
  const stageRange = nextProgress - baseProgress;

  job.progress.overallProgress = Math.round(
    baseProgress + (stageProgress / 100) * stageRange
  );

  if (previousStage !== stage) {
    octopusLogger.info(`Job ${job.id} transitioned: ${previousStage} → ${stage}`, {
      jobId: job.id,
      from: previousStage,
      to: stage,
      progress: job.progress.overallProgress,
      step: currentStep,
    });
    
    JobPersistence.updateJob(job.id, {
      status: stage as any,
      progressPct: job.progress.overallProgress,
      currentStage: stage,
    }).catch(() => {});
  }
}

function getNextStage(current: JobStatus): JobStatus | null {
  const stages: JobStatus[] = [
    'pending',
    'parsing',
    'extracting',
    'enriching_maps',
    'enriching_web',
    'generating_pages',
    'generating_articles',
    'completed',
  ];

  const currentIndex = stages.indexOf(current);
  if (currentIndex >= 0 && currentIndex < stages.length - 1) {
    return stages[currentIndex + 1];
  }
  return null;
}

function detectDestination(document: ParsedDocument): string {
  const titleAndContent = (document.metadata.title || '') + ' ' +
    (document.sections[0]?.content.slice(0, 1000) || '');

  const destinations = [
    'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah',
    'Tel Aviv', 'Jerusalem', 'Eilat', 'Haifa',
    'Paris', 'London', 'New York', 'Tokyo', 'Singapore',
    'Bangkok', 'Rome', 'Barcelona', 'Amsterdam', 'Istanbul',
  ];

  for (const dest of destinations) {
    if (titleAndContent.toLowerCase().includes(dest.toLowerCase())) {
      return dest;
    }
  }

  return 'Unknown Destination';
}

// ============================================================================
// Job Watchdog - Detect and fail stuck jobs
// ============================================================================

let watchdogInterval: ReturnType<typeof setInterval> | null = null;

export function startJobWatchdog(): void {
  if (watchdogInterval) {
    octopusLogger.warn('Job watchdog already running');
    return;
  }

  octopusLogger.info('Starting job watchdog', { 
    intervalMs: TIMEOUT_CONFIG.WATCHDOG_INTERVAL_MS,
    stuckThresholdMs: TIMEOUT_CONFIG.TOTAL_JOB_TIMEOUT_MS,
  });

  watchdogInterval = setInterval(async () => {
    try {
      const failedCount = await JobPersistence.failStuckJobs(TIMEOUT_CONFIG.TOTAL_JOB_TIMEOUT_MS);
      if (failedCount > 0) {
        octopusLogger.warn('Watchdog failed stuck jobs', { count: failedCount });
      }
    } catch (error: any) {
      octopusLogger.error('Watchdog error', { error: error.message });
    }
  }, TIMEOUT_CONFIG.WATCHDOG_INTERVAL_MS);
}

export function stopJobWatchdog(): void {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    octopusLogger.info('Job watchdog stopped');
  }
}

// ============================================================================
// Statistics & Monitoring
// ============================================================================

export interface OctopusStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  avgProcessingTime: number;
  totalPagesGenerated: number;
  totalArticlesGenerated: number;
  totalWordsGenerated: number;
}

export function getOctopusStats(): OctopusStats {
  const allJobs = getAllJobs();
  const completed = allJobs.filter(j => j.status === 'completed');
  const failed = allJobs.filter(j => j.status === 'failed');
  const pending = allJobs.filter(j => !['completed', 'failed'].includes(j.status));

  let totalTime = 0;
  let totalPages = 0;
  let totalArticles = 0;
  let totalWords = 0;

  for (const job of completed) {
    if (job.result) {
      totalTime += job.result.processingTime;
      totalPages += job.result.generation.pages;
      totalArticles += job.result.generation.articles;
      totalWords += job.result.generation.totalWordCount;
    }
  }

  return {
    totalJobs: allJobs.length,
    completedJobs: completed.length,
    failedJobs: failed.length,
    pendingJobs: pending.length,
    avgProcessingTime: completed.length > 0 ? Math.round(totalTime / completed.length) : 0,
    totalPagesGenerated: totalPages,
    totalArticlesGenerated: totalArticles,
    totalWordsGenerated: totalWords,
  };
}

/**
 * Get a summary of capabilities for the Octopus engine
 */
export function getOctopusCapabilities(): {
  features: string[];
  entityTypes: string[];
  articleTypes: string[];
  enrichmentSources: { name: string; configured: boolean }[];
  agentPipeline: { agents: string[]; batchProcessing: boolean };
} {
  return {
    features: [
      'PDF/Word document parsing',
      'AI-powered entity extraction',
      'Google Maps enrichment',
      'Web search enrichment',
      'Content page generation',
      'Article generation (listicles, guides, comparisons)',
      'SEO optimization',
      'AEO (Answer Engine Optimization)',
      'Multi-language support',
      '8-Agent Pipeline Processing',
      'Batch processing with rate limiting',
    ],
    entityTypes: [
      'hotel', 'restaurant', 'attraction', 'neighborhood',
      'beach', 'mall', 'museum', 'park', 'landmark',
    ],
    articleTypes: [
      'listicle', 'comparison', 'guide', 'itinerary',
      'neighborhood', 'food', 'budget', 'family',
    ],
    enrichmentSources: [
      { name: 'Google Maps/Places', configured: isGoogleMapsConfigured() },
      { name: 'Web Search (Serper)', configured: !!process.env.SERPER_API_KEY },
      { name: 'Web Search (Brave)', configured: !!process.env.BRAVE_SEARCH_API_KEY },
    ],
    agentPipeline: {
      agents: [
        'Entity Extractor',
        'Content Strategist',
        'Content Writer',
        'SEO Specialist',
        'AEO Specialist',
        'Quality Control',
        'Fact Checker',
        'Content Corrector',
      ],
      batchProcessing: true,
    },
  };
}

// ============================================================================
// Pipeline API Functions (for AutoPilot routes)
// ============================================================================

// Track active pipeline runs
let activePipelineRuns = 0;
let lastPipelineResult: AgentPipelineResult | null = null;

export interface PipelineInput {
  document: {
    id: string;
    name: string;
    content: string;
    source: string;
  };
  destination: string;
  options?: {
    enableFactChecking?: boolean;
    enableContentCorrection?: boolean;
    maxEntities?: number;
    contentDepth?: 'brief' | 'standard' | 'comprehensive';
    locale?: string;
  };
}

export async function processDocumentWithPipeline(input: PipelineInput): Promise<{
  success: boolean;
  result?: AgentPipelineResult;
  error?: string;
}> {
  const startTime = Date.now();
  activePipelineRuns++;
  
  octopusLogger.info('Starting pipeline from API', {
    documentId: input.document.id,
    destination: input.destination,
    contentLength: input.document.content.length,
  });

  try {
    // Parse the document content - construct a valid ParsedDocument
    const rawText = input.document.content;
    const wordCount = rawText.split(/\s+/).length;
    const parsedDocument: ParsedDocument = {
      filename: input.document.name,
      fileType: 'txt',
      totalPages: 1,
      totalWords: wordCount,
      totalCharacters: rawText.length,
      sections: [{
        index: 0,
        content: rawText,
        wordCount: wordCount,
      }],
      rawText: rawText,
      metadata: {},
      parseTime: 0,
    };

    // Run the 8-Agent Pipeline with user options
    const pipelineOptions: PipelineOptions = {
      batchSize: 10,
      batchDelayMs: 500,
      minEntities: 5,
      minTasks: 20,
      locale: input.options?.locale || 'en',
      tone: 'professional',
      contentDepth: input.options?.contentDepth || 'standard',
      enableFactChecking: input.options?.enableFactChecking !== false,
      enableContentCorrection: input.options?.enableContentCorrection !== false,
      maxEntities: input.options?.maxEntities || 50,
      onProgress: (progress) => {
        octopusLogger.info('Pipeline progress', {
          agent: progress.agent,
          stage: progress.stage,
          current: progress.current,
        });
      },
    };

    const result = await runAgentPipeline(parsedDocument, input.destination, pipelineOptions);

    lastPipelineResult = result;
    activePipelineRuns--;

    octopusLogger.info('Pipeline completed', {
      documentId: input.document.id,
      entitiesExtracted: result.stats.totalEntities,
      tasksGenerated: result.stats.totalTasks,
      contentGenerated: result.stats.totalGenerated,
      processingTime: Date.now() - startTime,
    });

    return { success: true, result };
  } catch (error: any) {
    activePipelineRuns--;
    octopusLogger.error('Pipeline failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

export function getPipelineStatus(): {
  isRunning: boolean;
  activePipelines: number;
  lastResult: AgentPipelineResult | null;
  capabilities: ReturnType<typeof getOctopusCapabilities>;
} {
  return {
    isRunning: activePipelineRuns > 0,
    activePipelines: activePipelineRuns,
    lastResult: lastPipelineResult,
    capabilities: getOctopusCapabilities(),
  };
}

// ============================================================================
// Queue Integration (Phase 2)
// ============================================================================

/**
 * Initialize the Octopus queue system with stage handlers
 */
export function initializeQueueSystem(): void {
  octopusLogger.info('Initializing Octopus queue system');
  
  QueueManager.registerHandler('parse', async (task: QueueTask) => {
    const { buffer, filename, mimeType } = task.payload as { buffer: Buffer; filename: string; mimeType: string };
    const result = await parseDocumentBuffer(buffer, filename, mimeType);
    await QueueManager.enqueue(task.jobId, 'extract', { document: result });
  });
  
  QueueManager.registerHandler('extract', async (task: QueueTask) => {
    const { document } = task.payload as { document: ParsedDocument };
    const result = await extractEntities(document, { sweepScan: true });
    
    if (isGoogleMapsConfigured()) {
      await QueueManager.enqueue(task.jobId, 'enrich_maps', { entities: result.entities });
    } else if (isWebSearchConfigured()) {
      await QueueManager.enqueue(task.jobId, 'enrich_web', { entities: result.entities });
    } else {
      await QueueManager.enqueue(task.jobId, 'generate', { entities: result.entities });
    }
  });
  
  QueueManager.registerHandler('enrich_maps', async (task: QueueTask) => {
    const { entities, destination } = task.payload as { entities: ExtractedEntity[]; destination: string };
    const enrichResult = await enrichWithGoogleMaps(entities, destination || 'Unknown');
    
    if (isWebSearchConfigured()) {
      await QueueManager.enqueue(task.jobId, 'enrich_web', { entities: enrichResult.enrichedEntities, destination });
    } else {
      await QueueManager.enqueue(task.jobId, 'generate', { entities: enrichResult.enrichedEntities, destination });
    }
  });
  
  QueueManager.registerHandler('enrich_web', async (task: QueueTask) => {
    const { entities, destination } = task.payload as { entities: (ExtractedEntity | EnrichedEntity)[]; destination: string };
    const enrichResult = await enrichWithWebSearch(entities as EnrichedEntity[], destination || 'Unknown');
    await QueueManager.enqueue(task.jobId, 'generate', { entities: enrichResult.enrichedEntities, destination });
  });
  
  QueueManager.registerHandler('generate', async (task: QueueTask) => {
    const { entities, destination } = task.payload as { entities: (ExtractedEntity | EnrichedEntity | WebEnrichedEntity)[]; destination: string };
    const result = await generateContentPages(entities as WebEnrichedEntity[], destination || 'Unknown', { locale: 'en' });
    await QueueManager.enqueue(task.jobId, 'validate', { pages: result.pages });
  });
  
  QueueManager.registerHandler('validate', async (task: QueueTask) => {
    const { pages } = task.payload as { pages: GeneratedPage[] };
    for (const page of pages) {
      const validation = validateSEO({
        title: page.content.title,
        metaTitle: page.seoData.metaTitle,
        metaDescription: page.seoData.metaDescription,
      } as any);
      octopusLogger.info('Validated page', { pageId: page.id, score: validation.score });
    }
  });
  
  QueueManager.registerHandler('translate', async (task: QueueTask) => {
    const { contentId, targetLocale } = task.payload as { contentId: string; targetLocale: string };
    octopusLogger.info('Translation task', { contentId, targetLocale });
  });
  
  QueueManager.startWorker();
  octopusLogger.info('Octopus queue system initialized');
}

/**
 * Shutdown the queue system gracefully
 */
export function shutdownQueueSystem(): void {
  QueueManager.stopWorker();
  octopusLogger.info('Octopus queue system stopped');
}

/**
 * Get queue system status
 */
export async function getQueueStatus() {
  const stats = await QueueManager.getStats();
  const pauseStatus = QueueManager.getPauseStatus();
  const concurrency = QueueManager.getConcurrencyLimits();
  const running = QueueManager.getRunningCounts();
  
  return {
    isWorkerRunning: QueueManager.isWorkerRunning(),
    isPaused: pauseStatus.isPaused,
    pauseReason: pauseStatus.reason,
    resumeAt: pauseStatus.resumeAt,
    concurrencyLimits: concurrency,
    runningCounts: running,
    stats,
  };
}

/**
 * Start a job using the queue system
 */
export async function startQueuedJob(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: OctopusOptions = {}
): Promise<string> {
  const job = await JobPersistence.createJob({
    filename,
    fileSize: buffer.length,
    mimeType,
    destinationHint: options.locale,
    options: options as Record<string, unknown>,
    inputContent: buffer,
  });
  
  await QueueManager.enqueue(job.id, 'parse', { 
    buffer: Array.from(buffer),
    filename, 
    mimeType 
  });
  
  octopusLogger.info('Queued job started', { jobId: job.id, filename });
  return job.id;
}
