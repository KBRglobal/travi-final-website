/**
 * Content Factory - The Self-Sustaining Content Engine
 *
 * This is the main orchestrator that:
 * 1. Takes research documents
 * 2. Extracts all entities
 * 3. Multiplies into hundreds of content pieces
 * 4. Publishes core content immediately
 * 5. Queues extended content as drafts
 * 6. Runs in an infinite loop, each content spawning more content
 *
 * THE FLYWHEEL:
 * Research → Entities → Content Tasks → Generated Content → More Content Ideas → Loop
 */

import { parseDocument, type ParsedDocument } from './document-parser';
import { extractEntities, type ExtractedEntity, type ExtractionResult } from './entity-extractor';
import {
  multiplyContent,
  getNextTasks,
  getImmediateTasks,
  getDraftTasks,
  type ContentTask,
  type MultiplicationResult,
  type MultiplicationConfig,
} from './content-multiplier';
import { generateFAQSection, generateQuickAnswer, optimizeForAEO } from './aeo-optimizer';
import { generatePageSchemas, type FAQSchemaItem, type BreadcrumbItem } from './schema-generator';
import { generateInternalLinks, type LinkableEntity } from './internal-linker';
import { batchUpsertEntities } from './entity-upsert';
import { db } from '../db';
import { contents } from '@shared/schema';
import { emitContentPublished } from '../events/content-events';
import { log } from '../lib/logger';
import { queuedAIRequest, RequestPriority } from '../ai/request-queue';

const factoryLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ContentFactory] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[ContentFactory] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[ContentFactory] ${msg}`, data),
};

// ============================================================================
// TYPES
// ============================================================================

export interface FactoryConfig {
  // Processing limits
  maxConcurrentTasks: number;
  batchSize: number;

  // Content settings
  multiplicationConfig: MultiplicationConfig;

  // Auto-publish settings
  autoPublishImmediate: boolean;  // Auto-publish TIER 1 content
  autoPublishDrafts: boolean;     // Keep TIER 2 as drafts

  // Queue settings
  processingIntervalMs: number;   // How often to process queue
  maxDailyContent: number;        // Max content pieces per day

  // Feature flags
  enableAEO: boolean;
  enableSchemaGeneration: boolean;
  enableInternalLinking: boolean;
}

export interface FactoryState {
  status: 'idle' | 'processing' | 'paused';
  currentQueue: ContentTask[];
  completedToday: number;
  totalGenerated: number;
  lastProcessedAt: Date | null;
  errors: FactoryError[];
}

export interface FactoryError {
  taskId: string;
  error: string;
  timestamp: Date;
  retryCount: number;
}

export interface GeneratedContent {
  taskId: string;
  title: string;
  slug: string;
  content: {
    html: string;
    markdown: string;
    plainText: string;
  };
  metadata: {
    description: string;
    keywords: string[];
    wordCount: number;
  };
  seo: {
    schema: Record<string, unknown>[];
    faq?: FAQSchemaItem[];
    quickAnswer?: string;
  };
  internalLinks: {
    url: string;
    anchor: string;
    context: string;
  }[];
  tier: 'immediate' | 'draft';
  publishedAt?: Date;
  generatedAt: Date;
}

export interface FactoryStats {
  totalResearchProcessed: number;
  totalEntitiesExtracted: number;
  totalContentTasks: number;
  contentGenerated: {
    immediate: number;
    draft: number;
  };
  byContentType: Record<string, number>;
  averageWordsPerContent: number;
  processingTimeMs: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: FactoryConfig = {
  maxConcurrentTasks: 10,
  batchSize: Infinity,
  multiplicationConfig: {
    maxComparisons: 50,
    maxRankings: 20,
    generateSeasonalContent: true,
    generateBudgetGuides: true,
    generateHiddenGems: true,
  },
  autoPublishImmediate: true,
  autoPublishDrafts: false,
  processingIntervalMs: 60000, // 1 minute
  maxDailyContent: 100,
  enableAEO: true,
  enableSchemaGeneration: true,
  enableInternalLinking: true,
};

// ============================================================================
// CONTENT FACTORY CLASS
// ============================================================================

export class ContentFactory {
  private config: FactoryConfig;
  private state: FactoryState;
  private processingInterval: NodeJS.Timeout | null = null;
  private allEntities: ExtractedEntity[] = [];
  private contentStore: Map<string, GeneratedContent> = new Map();

  constructor(config: Partial<FactoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      status: 'idle',
      currentQueue: [],
      completedToday: 0,
      totalGenerated: 0,
      lastProcessedAt: null,
      errors: [],
    };
  }

  // ==========================================================================
  // MAIN ENTRY POINT: Process Research
  // ==========================================================================

  /**
   * Process a research document and generate all possible content
   */
  async processResearch(
    documentPath: string,
    destination: string
  ): Promise<{
    extraction: ExtractionResult;
    multiplication: MultiplicationResult;
    immediateContent: GeneratedContent[];
    stats: FactoryStats;
  }> {
    const startTime = Date.now();
    factoryLogger.info('Processing research document', { documentPath, destination });

    // Step 1: Parse document
    const parsed = await parseDocument(documentPath);
    factoryLogger.info('Document parsed', {
      sections: parsed.sections.length,
      words: parsed.totalWords,
    });

    // Step 2: Extract entities
    const extraction = await extractEntities(parsed);
    this.allEntities.push(...extraction.entities);
    factoryLogger.info('Entities extracted', {
      total: extraction.entities.length,
      byType: extraction.summary.byType,
    });

    // Step 2.5: Persist entities to database
    const upsertResult = await batchUpsertEntities(extraction.entities, destination);
    factoryLogger.info('Entities persisted to DB', {
      created: upsertResult.created,
      updated: upsertResult.updated,
      unchanged: upsertResult.unchanged,
      errors: upsertResult.errors,
    });

    // Step 3: Multiply into content tasks
    const multiplication = multiplyContent(
      extraction.entities,
      destination,
      this.config.multiplicationConfig
    );
    this.state.currentQueue.push(...multiplication.tasks);
    factoryLogger.info('Content multiplied', {
      totalTasks: multiplication.tasks.length,
      immediate: multiplication.stats.byTier.immediate,
      drafts: multiplication.stats.byTier.draft,
    });

    // Step 4: Generate immediate (TIER 1) content
    const immediateTasks = getImmediateTasks(multiplication.tasks);
    const immediateContent = await this.generateBatch(immediateTasks);
    factoryLogger.info('Immediate content generated', {
      count: immediateContent.length,
    });

    // Step 5: Calculate stats
    const stats: FactoryStats = {
      totalResearchProcessed: 1,
      totalEntitiesExtracted: extraction.entities.length,
      totalContentTasks: multiplication.tasks.length,
      contentGenerated: {
        immediate: immediateContent.length,
        draft: 0,
      },
      byContentType: multiplication.stats.byType as Record<string, number>,
      averageWordsPerContent: multiplication.stats.estimatedTotalWords / multiplication.tasks.length,
      processingTimeMs: Date.now() - startTime,
    };

    return {
      extraction,
      multiplication,
      immediateContent,
      stats,
    };
  }

  /**
   * Process raw research text (not from file)
   */
  async processResearchText(
    text: string,
    destination: string,
    metadata?: { title?: string; source?: string }
  ): Promise<{
    extraction: ExtractionResult;
    multiplication: MultiplicationResult;
    immediateContent: GeneratedContent[];
    stats: FactoryStats;
  }> {
    const startTime = Date.now();
    factoryLogger.info('Processing research text', {
      length: text.length,
      destination,
    });

    // Create a pseudo-parsed document
    const parsed: ParsedDocument = {
      filename: metadata?.source || 'research-text',
      fileType: 'txt',
      totalPages: 1,
      totalWords: text.split(/\s+/).length,
      totalCharacters: text.length,
      sections: [{
        index: 0,
        title: metadata?.title || 'Research',
        content: text,
        wordCount: text.split(/\s+/).length,
      }],
      metadata: {
        title: metadata?.title,
      },
      rawText: text,
      parseTime: 0,
    };

    // Use same pipeline
    const extraction = await extractEntities(parsed);
    this.allEntities.push(...extraction.entities);

    // Persist entities to database
    const upsertResult = await batchUpsertEntities(extraction.entities, destination);
    factoryLogger.info('Entities persisted to DB', {
      created: upsertResult.created,
      updated: upsertResult.updated,
      unchanged: upsertResult.unchanged,
      errors: upsertResult.errors,
    });

    const multiplication = multiplyContent(
      extraction.entities,
      destination,
      this.config.multiplicationConfig
    );
    this.state.currentQueue.push(...multiplication.tasks);

    const immediateTasks = getImmediateTasks(multiplication.tasks);
    const immediateContent = await this.generateBatch(immediateTasks);

    const stats: FactoryStats = {
      totalResearchProcessed: 1,
      totalEntitiesExtracted: extraction.entities.length,
      totalContentTasks: multiplication.tasks.length,
      contentGenerated: {
        immediate: immediateContent.length,
        draft: 0,
      },
      byContentType: multiplication.stats.byType as Record<string, number>,
      averageWordsPerContent: multiplication.stats.estimatedTotalWords / multiplication.tasks.length,
      processingTimeMs: Date.now() - startTime,
    };

    return { extraction, multiplication, immediateContent, stats };
  }

  // ==========================================================================
  // CONTENT GENERATION
  // ==========================================================================

  /**
   * Generate content for a batch of tasks
   */
  async generateBatch(tasks: ContentTask[]): Promise<GeneratedContent[]> {
    const results: GeneratedContent[] = [];

    for (const task of tasks) {
      try {
        const content = await this.generateContent(task);
        results.push(content);
        this.contentStore.set(task.id, content);

        // Persist to DB and emit publish event for immediate tier content
        if (task.tier === 'immediate' && this.config.autoPublishImmediate) {
          try {
            const contentId = await this.persistAndPublish(content, task.destination);
            factoryLogger.info('Content persisted and published', {
              taskId: task.id,
              contentId,
              title: content.title,
            });
          } catch (persistError) {
            factoryLogger.error('Failed to persist content', {
              taskId: task.id,
              error: String(persistError),
            });
          }
        }

        // Update task status
        task.status = this.config.autoPublishImmediate && task.tier === 'immediate'
          ? 'published'
          : 'review';

        this.state.totalGenerated++;
        this.state.completedToday++;
      } catch (error) {
        factoryLogger.error('Failed to generate content', {
          taskId: task.id,
          error: String(error),
        });
        this.state.errors.push({
          taskId: task.id,
          error: String(error),
          timestamp: new Date(),
          retryCount: 0,
        });
      }
    }

    return results;
  }

  /**
   * Persist generated content to DB and emit publish event
   */
  private async persistAndPublish(content: GeneratedContent, destination: string): Promise<string> {
    // Map content type from task type
    const contentType = this.mapTaskTypeToContentType(content.taskId);
    
    // Insert into contents table
    const [inserted] = await db.insert(contents).values({
      type: contentType,
      status: 'published',
      title: content.title,
      slug: content.slug,
      metaDescription: content.metadata.description,
      primaryKeyword: content.metadata.keywords[0] || null,
      secondaryKeywords: content.metadata.keywords.slice(1),
      blocks: [{ type: 'html', data: { html: content.content.html, markdown: content.content.markdown } }],
      seoSchema: content.seo.schema.length > 0 ? content.seo.schema[0] : null,
      answerCapsule: content.seo.quickAnswer || null,
      wordCount: content.metadata.wordCount,
      generatedByAI: true,
      publishedAt: new Date(),
    }).returning({ id: contents.id });

    const contentId = inserted.id;

    // Emit publish event
    emitContentPublished(
      contentId,
      contentType,
      content.title,
      content.slug,
      'draft', // previousStatus before auto-publish
      'auto-pilot'
    );

    return contentId;
  }

  /**
   * Map task ID to content type
   */
  private mapTaskTypeToContentType(taskId: string): 'article' | 'attraction' | 'hotel' | 'dining' | 'district' | 'itinerary' | 'landing_page' {
    // Extract type from task ID pattern (e.g., "entity_page_hotel_xxx" -> "hotel")
    if (taskId.includes('hotel')) return 'hotel';
    if (taskId.includes('dining') || taskId.includes('restaurant')) return 'dining';
    if (taskId.includes('attraction')) return 'attraction';
    if (taskId.includes('district') || taskId.includes('neighborhood')) return 'district';
    if (taskId.includes('itinerary')) return 'itinerary';
    return 'article'; // Default to article for comparisons, rankings, FAQs, etc.
  }

  /**
   * Generate content for a single task
   */
  async generateContent(task: ContentTask): Promise<GeneratedContent> {
    factoryLogger.info('Generating content', { taskId: task.id, type: task.type });

    // Get template-specific content
    const { html, markdown, plainText } = await this.generateFromTemplate(task);

    // AEO optimization
    let seo: GeneratedContent['seo'] = { schema: [] };

    if (this.config.enableAEO && task.primaryEntity) {
      const entity = this.allEntities.find(e => e.id === task.primaryEntity);
      if (entity) {
        // Map entity type to supported AEO type
        const aeoEntityType = this.mapToAEOEntityType(entity.type);

        // Generate FAQ
        const faqSection = generateFAQSection(
          entity.name,
          aeoEntityType,
          [], // PAA questions would come from paa-researcher
          [],
          { destination: task.destination }
        );
        seo.faq = faqSection.items.map(item => ({
          question: item.question,
          answer: item.answer,
        }));

        // Generate Quick Answer
        const aeoTypeWithDestination = aeoEntityType === 'neighborhood' ? 'neighborhood' : aeoEntityType;
        const quickAnswer = generateQuickAnswer(
          `What is ${entity.name}?`,
          {
            entityName: entity.name,
            entityType: aeoTypeWithDestination as 'hotel' | 'restaurant' | 'attraction' | 'neighborhood' | 'destination',
            keyFacts: (entity as any).highlights || [],
          }
        );
        seo.quickAnswer = quickAnswer.answer;
      }
    }

    // Schema generation
    if (this.config.enableSchemaGeneration) {
      const schemaEntityType = this.mapToSchemaEntityType(task.type);
      const schemas = generatePageSchemas(
        schemaEntityType,
        task.variables as Record<string, unknown>,
        seo.faq || [],
        this.buildBreadcrumbs(task),
        'https://travi.com'
      );
      // Combine all schemas
      seo.schema = [
        schemas.primary.schema,
        schemas.breadcrumbs.schema,
        ...(schemas.faq ? [schemas.faq.schema] : []),
        ...schemas.additional.map(s => s.schema),
      ];
    }

    // Internal linking
    let internalLinks: GeneratedContent['internalLinks'] = [];
    if (this.config.enableInternalLinking && task.primaryEntity) {
      const entity = this.allEntities.find(e => e.id === task.primaryEntity);
      if (entity) {
        const linkableEntity = this.toLinkableEntity(entity, task.destination);
        const allLinkable = this.allEntities.map(e => this.toLinkableEntity(e, task.destination));
        const linkPlan = generateInternalLinks(linkableEntity, allLinkable);

        internalLinks = linkPlan.links.map(link => ({
          url: link.url,
          anchor: link.text,
          context: link.reason || '',
        }));
      }
    }

    return {
      taskId: task.id,
      title: task.title,
      slug: task.slug,
      content: { html, markdown, plainText },
      metadata: {
        description: this.generateMetaDescription(task),
        keywords: this.extractKeywords(task),
        wordCount: plainText.split(/\s+/).length,
      },
      seo,
      internalLinks,
      tier: task.tier,
      generatedAt: new Date(),
      publishedAt: task.tier === 'immediate' && this.config.autoPublishImmediate
        ? new Date()
        : undefined,
    };
  }

  /**
   * Generate content from template
   */
  private async generateFromTemplate(task: ContentTask): Promise<{
    html: string;
    markdown: string;
    plainText: string;
  }> {
    // This would integrate with content-generators.ts or use AI
    // For now, return placeholder that indicates structure

    const { title, type, variables } = task;

    // Different templates for different content types
    let markdown = '';

    switch (type) {
      case 'entity_page':
        markdown = this.generateEntityPageContent(task);
        break;
      case 'comparison':
        markdown = this.generateComparisonContent(task);
        break;
      case 'ranking':
        markdown = this.generateRankingContent(task);
        break;
      case 'faq_page':
        markdown = this.generateFAQContent(task);
        break;
      case 'worth_it':
        markdown = this.generateWorthItContent(task);
        break;
      case 'area_guide':
        markdown = this.generateAreaGuideContent(task);
        break;
      case 'itinerary':
        markdown = this.generateItineraryContent(task);
        break;
      default:
        markdown = `# ${title}\n\nContent for ${type} coming soon...`;
    }

    // Convert markdown to HTML and plain text
    const html = this.markdownToHtml(markdown);
    const plainText = this.markdownToPlainText(markdown);

    return { html, markdown, plainText };
  }

  // ==========================================================================
  // CONTENT TEMPLATES
  // ==========================================================================

  private generateEntityPageContent(task: ContentTask): string {
    const entity = task.variables.entity as ExtractedEntity;
    if (!entity) return `# ${task.title}\n\nNo entity data available.`;

    const sections = [
      `# ${entity.name}`,
      '',
      entity.description || 'Description coming soon...',
      '',
      '## Overview',
      '',
      `${entity.name} is a ${entity.type} located in ${entity.location?.neighborhood || entity.location?.city || task.destination}.`,
      '',
    ];

    // Add type-specific sections
    if (entity.type === 'hotel') {
      const hotel = entity as any;
      sections.push('## Amenities');
      sections.push('');
      if (hotel.amenities?.length) {
        sections.push(hotel.amenities.map((a: string) => `- ${a}`).join('\n'));
      }
      sections.push('');
      sections.push('## Room Types');
      sections.push('');
      if (hotel.roomTypes?.length) {
        sections.push(hotel.roomTypes.map((r: string) => `- ${r}`).join('\n'));
      }
    }

    if (entity.type === 'restaurant') {
      const restaurant = entity as any;
      sections.push('## Cuisine');
      sections.push('');
      if (restaurant.cuisineType?.length) {
        sections.push(restaurant.cuisineType.join(', '));
      }
      sections.push('');
      sections.push('## Specialties');
      sections.push('');
      if (restaurant.specialties?.length) {
        sections.push(restaurant.specialties.map((s: string) => `- ${s}`).join('\n'));
      }
    }

    // Add FAQ section placeholder
    sections.push('');
    sections.push('## Frequently Asked Questions');
    sections.push('');
    sections.push(`### What makes ${entity.name} special?`);
    sections.push('');
    sections.push(`${entity.name} stands out for its unique offerings in ${task.destination}.`);

    return sections.join('\n');
  }

  private generateComparisonContent(task: ContentTask): string {
    const entityA = task.variables.entityA as ExtractedEntity;
    const entityB = task.variables.entityB as ExtractedEntity;

    if (!entityA || !entityB) {
      return `# ${task.title}\n\nComparison data not available.`;
    }

    return `# ${entityA.name} vs ${entityB.name}

Choosing between ${entityA.name} and ${entityB.name}? Here's a detailed comparison to help you decide.

## Quick Comparison

| Feature | ${entityA.name} | ${entityB.name} |
|---------|-----------------|-----------------|
| Type | ${entityA.type} | ${entityB.type} |
| Location | ${entityA.location?.neighborhood || 'N/A'} | ${entityB.location?.neighborhood || 'N/A'} |
| Rating | ${(entityA as any).rating || 'N/A'} | ${(entityB as any).rating || 'N/A'} |

## ${entityA.name}

${entityA.description || 'Description coming soon...'}

## ${entityB.name}

${entityB.description || 'Description coming soon...'}

## Our Verdict

Both ${entityA.name} and ${entityB.name} offer excellent experiences in ${task.destination}. Your choice depends on your priorities and preferences.

## FAQ

### Which is better, ${entityA.name} or ${entityB.name}?

The answer depends on what you're looking for. ${entityA.name} excels in certain areas, while ${entityB.name} has its own strengths.

### Are ${entityA.name} and ${entityB.name} similar?

They share some similarities as they're both ${task.variables.entityType}s in ${task.destination}, but each has unique characteristics.
`;
  }

  private generateRankingContent(task: ContentTask): string {
    const entities = task.variables.entities as ExtractedEntity[];
    const entityType = task.variables.entityType as string;

    if (!entities?.length) {
      return `# ${task.title}\n\nRanking data not available.`;
    }

    const sections = [
      `# ${task.title}`,
      '',
      `Looking for the best ${entityType}s in ${task.destination}? We've ranked the top options based on quality, value, and visitor reviews.`,
      '',
      '## Quick Summary',
      '',
    ];

    // Add quick summary list
    entities.forEach((entity, index) => {
      sections.push(`${index + 1}. **${entity.name}** - ${entity.description?.slice(0, 100) || 'Top choice'}...`);
    });

    sections.push('');
    sections.push('---');
    sections.push('');

    // Add detailed sections for each entity
    entities.forEach((entity, index) => {
      sections.push(`## ${index + 1}. ${entity.name}`);
      sections.push('');
      sections.push(entity.description || 'Description coming soon...');
      sections.push('');

      if (entity.location?.neighborhood) {
        sections.push(`**Location:** ${entity.location.neighborhood}`);
        sections.push('');
      }

      sections.push('---');
      sections.push('');
    });

    // Add FAQ
    sections.push('## Frequently Asked Questions');
    sections.push('');
    sections.push(`### What is the best ${entityType} in ${task.destination}?`);
    sections.push('');
    sections.push(`Based on our research, ${entities[0]?.name || 'the top-ranked option'} is considered the best overall.`);

    return sections.join('\n');
  }

  private generateFAQContent(task: ContentTask): string {
    const entity = task.variables.entity as ExtractedEntity;

    if (!entity) {
      return `# ${task.title}\n\nFAQ data not available.`;
    }

    const questions = [
      { q: `What is ${entity.name}?`, a: entity.description || `${entity.name} is a popular ${entity.type} in ${task.destination}.` },
      { q: `Where is ${entity.name} located?`, a: `${entity.name} is located in ${entity.location?.neighborhood || entity.location?.city || task.destination}.` },
      { q: `Is ${entity.name} worth visiting?`, a: `Yes, ${entity.name} is highly recommended for visitors to ${task.destination}.` },
      { q: `How do I get to ${entity.name}?`, a: `${entity.name} is easily accessible from major areas in ${task.destination}.` },
      { q: `What are the opening hours of ${entity.name}?`, a: `Please check the official website for current opening hours.` },
      { q: `What should I know before visiting ${entity.name}?`, a: `We recommend planning ahead and checking for any special requirements.` },
    ];

    const sections = [
      `# ${entity.name} - Frequently Asked Questions`,
      '',
      `Everything you need to know about ${entity.name} in ${task.destination}.`,
      '',
    ];

    questions.forEach(({ q, a }) => {
      sections.push(`## ${q}`);
      sections.push('');
      sections.push(a);
      sections.push('');
    });

    return sections.join('\n');
  }

  private generateWorthItContent(task: ContentTask): string {
    const entity = task.variables.entity as ExtractedEntity;

    if (!entity) {
      return `# ${task.title}\n\nReview data not available.`;
    }

    return `# Is ${entity.name} Worth It? Honest Review

Considering a visit to ${entity.name}? Here's our honest assessment to help you decide.

## Quick Verdict

${entity.name} is ${entity.type === 'hotel' ? 'a great choice for travelers' : 'worth visiting'} in ${task.destination}.

## What We Love

- Great location in ${entity.location?.neighborhood || task.destination}
- ${entity.description || 'Excellent overall experience'}
- Unique atmosphere and character

## Things to Consider

- Popular spot, can get crowded
- Book in advance during peak season
- Check for current availability

## The Bottom Line

**Is ${entity.name} worth it?** Yes, especially if you're looking for ${entity.type === 'hotel' ? 'quality accommodation' : 'a memorable experience'} in ${task.destination}.

## FAQ

### Is ${entity.name} overrated?

No, ${entity.name} lives up to its reputation and offers genuine value.

### Should I book ${entity.name} in advance?

Yes, we recommend booking ahead, especially during peak travel seasons.
`;
  }

  private generateAreaGuideContent(task: ContentTask): string {
    const area = task.variables.area as ExtractedEntity;
    const hotels = task.variables.hotels as ExtractedEntity[] || [];
    const restaurants = task.variables.restaurants as ExtractedEntity[] || [];
    const attractions = task.variables.attractions as ExtractedEntity[] || [];

    const areaName = area?.name || task.area || task.destination;

    const sections = [
      `# ${areaName} Area Guide`,
      '',
      `Your complete guide to exploring ${areaName} in ${task.destination}.`,
      '',
      '## Overview',
      '',
      area?.description || `${areaName} is one of the key areas to explore in ${task.destination}.`,
      '',
    ];

    if (hotels.length) {
      sections.push('## Where to Stay');
      sections.push('');
      hotels.slice(0, 5).forEach(hotel => {
        sections.push(`- **${hotel.name}** - ${hotel.description?.slice(0, 100) || 'Popular accommodation'}...`);
      });
      sections.push('');
    }

    if (restaurants.length) {
      sections.push('## Where to Eat');
      sections.push('');
      restaurants.slice(0, 5).forEach(restaurant => {
        sections.push(`- **${restaurant.name}** - ${restaurant.description?.slice(0, 100) || 'Great dining option'}...`);
      });
      sections.push('');
    }

    if (attractions.length) {
      sections.push('## What to See & Do');
      sections.push('');
      attractions.slice(0, 5).forEach(attraction => {
        sections.push(`- **${attraction.name}** - ${attraction.description?.slice(0, 100) || 'Must-visit spot'}...`);
      });
      sections.push('');
    }

    sections.push('## Getting Around');
    sections.push('');
    sections.push(`${areaName} is well-connected and easy to navigate.`);

    return sections.join('\n');
  }

  private generateItineraryContent(task: ContentTask): string {
    const days = task.variables.days as number;
    const attractions = task.variables.attractions as ExtractedEntity[] || [];
    const restaurants = task.variables.restaurants as ExtractedEntity[] || [];

    const sections = [
      `# ${task.title}`,
      '',
      `Make the most of your ${days} ${days === 1 ? 'day' : 'days'} in ${task.destination} with this carefully planned itinerary.`,
      '',
    ];

    for (let day = 1; day <= days; day++) {
      sections.push(`## Day ${day}`);
      sections.push('');
      sections.push('### Morning');
      sections.push('');
      const morningAttraction = attractions[(day - 1) * 2] || attractions[0];
      sections.push(morningAttraction
        ? `Start your day at **${morningAttraction.name}**.`
        : 'Explore the local area and enjoy breakfast.');
      sections.push('');
      sections.push('### Afternoon');
      sections.push('');
      const afternoonAttraction = attractions[(day - 1) * 2 + 1] || attractions[1];
      sections.push(afternoonAttraction
        ? `Visit **${afternoonAttraction.name}** for a memorable afternoon.`
        : 'Continue exploring or relax at your hotel.');
      sections.push('');
      sections.push('### Evening');
      sections.push('');
      const dinnerSpot = restaurants[day - 1] || restaurants[0];
      sections.push(dinnerSpot
        ? `Dine at **${dinnerSpot.name}** for an excellent meal.`
        : 'Enjoy dinner at one of the local restaurants.');
      sections.push('');
    }

    return sections.join('\n');
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private buildBreadcrumbs(task: ContentTask): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', url: '/' },
      { name: task.destination, url: `/${task.destination.toLowerCase()}` },
    ];

    if (task.area) {
      breadcrumbs.push({
        name: task.area,
        url: `/${task.destination.toLowerCase()}/${task.area.toLowerCase()}`,
      });
    }

    breadcrumbs.push({
      name: task.title,
      url: task.slug,
    });

    return breadcrumbs;
  }

  private toLinkableEntity(entity: ExtractedEntity, destination: string): LinkableEntity {
    // Map entity type to linkable type
    const linkableType = this.mapToLinkableType(entity.type);

    return {
      id: entity.id,
      type: linkableType,
      name: entity.name,
      url: `/${destination.toLowerCase()}/${entity.type}s/${entity.name.toLowerCase().replace(/\s+/g, '-')}`,
      neighborhood: entity.location?.neighborhood,
      geo: entity.location?.coordinates
        ? { latitude: entity.location.coordinates.lat, longitude: entity.location.coordinates.lng }
        : undefined,
      priceLevel: this.extractPriceLevel(entity),
    };
  }

  /**
   * Map EntityType to LinkableEntity type
   */
  private mapToLinkableType(type: string): LinkableEntity['type'] {
    const mapping: Record<string, LinkableEntity['type']> = {
      hotel: 'hotel',
      restaurant: 'restaurant',
      attraction: 'attraction',
      neighborhood: 'neighborhood',
      beach: 'attraction',
      mall: 'attraction',
      museum: 'attraction',
      park: 'attraction',
      landmark: 'attraction',
      transport: 'attraction',
      event: 'article',
    };
    return mapping[type] || 'article';
  }

  /**
   * Map content type to AEO entity type
   */
  private mapToAEOEntityType(type: string): 'hotel' | 'restaurant' | 'attraction' | 'neighborhood' {
    const mapping: Record<string, 'hotel' | 'restaurant' | 'attraction' | 'neighborhood'> = {
      hotel: 'hotel',
      restaurant: 'restaurant',
      attraction: 'attraction',
      neighborhood: 'neighborhood',
      beach: 'attraction',
      mall: 'attraction',
      museum: 'attraction',
      park: 'attraction',
      landmark: 'attraction',
    };
    return mapping[type] || 'attraction';
  }

  /**
   * Map ContentType to schema entity type
   */
  private mapToSchemaEntityType(contentType: string): 'hotel' | 'attraction' | 'itinerary' | 'restaurant' | 'neighborhood' | 'guide' {
    const mapping: Record<string, 'hotel' | 'attraction' | 'itinerary' | 'restaurant' | 'neighborhood' | 'guide'> = {
      entity_page: 'hotel',
      comparison: 'guide',
      ranking: 'guide',
      area_guide: 'neighborhood',
      category_roundup: 'guide',
      faq_page: 'guide',
      worth_it: 'guide',
      itinerary: 'itinerary',
      budget_guide: 'guide',
      seasonal: 'guide',
      hidden_gems: 'guide',
      vs_article: 'guide',
      tips_article: 'guide',
      neighborhood_update: 'neighborhood',
    };
    return mapping[contentType] || 'guide';
  }

  private extractPriceLevel(entity: ExtractedEntity): number {
    const priceRange = (entity as any).priceRange || '';
    if (priceRange.includes('$$$$')) return 5;
    if (priceRange.includes('$$$')) return 4;
    if (priceRange.includes('$$')) return 3;
    if (priceRange.includes('$')) return 2;
    return 3; // Default mid-range
  }

  private generateMetaDescription(task: ContentTask): string {
    const entity = task.variables.entity as ExtractedEntity;
    if (entity?.description) {
      return entity.description.slice(0, 160);
    }
    return `Discover ${task.title} in ${task.destination}. Complete guide with reviews, tips, and recommendations.`;
  }

  private extractKeywords(task: ContentTask): string[] {
    const keywords = [task.destination, task.type.replace('_', ' ')];

    if (task.area) keywords.push(task.area);

    const entity = task.variables.entity as ExtractedEntity;
    if (entity) {
      keywords.push(entity.name, entity.type);
    }

    return keywords;
  }

  private markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    // In production, use a proper library like marked
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|l|p])/gm, '<p>')
      .replace(/(?<![>])$/gm, '</p>');
  }

  private markdownToPlainText(markdown: string): string {
    return markdown
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^-\s*/gm, '')
      .replace(/\|.*\|/g, '')
      .replace(/---/g, '')
      .trim();
  }

  // ==========================================================================
  // QUEUE MANAGEMENT (INFINITE LOOP)
  // ==========================================================================

  /**
   * Start the content factory loop
   */
  start(): void {
    if (this.processingInterval) return;

    this.state.status = 'processing';
    factoryLogger.info('Content Factory started');

    this.processingInterval = setInterval(
      () => this.processQueue(),
      this.config.processingIntervalMs
    );
  }

  /**
   * Stop the content factory loop
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.state.status = 'idle';
    factoryLogger.info('Content Factory stopped');
  }

  /**
   * Pause processing
   */
  pause(): void {
    this.state.status = 'paused';
    factoryLogger.info('Content Factory paused');
  }

  /**
   * Resume processing
   */
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'processing';
      factoryLogger.info('Content Factory resumed');
    }
  }

  /**
   * Process the next batch from queue
   */
  private async processQueue(): Promise<void> {
    if (this.state.status !== 'processing') return;
    if (this.state.completedToday >= this.config.maxDailyContent) {
      factoryLogger.info('Daily content limit reached');
      return;
    }

    const nextTasks = getNextTasks(this.state.currentQueue, this.config.batchSize);

    if (nextTasks.length === 0) {
      factoryLogger.info('Queue empty, waiting for more content');
      return;
    }

    factoryLogger.info('Processing queue batch', { count: nextTasks.length });

    await this.generateBatch(nextTasks);

    this.state.lastProcessedAt = new Date();
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  getState(): FactoryState {
    return { ...this.state };
  }

  getContent(taskId: string): GeneratedContent | undefined {
    return this.contentStore.get(taskId);
  }

  getAllContent(): GeneratedContent[] {
    return Array.from(this.contentStore.values());
  }

  getQueueStats(): {
    total: number;
    pending: number;
    generating: number;
    review: number;
    published: number;
  } {
    const stats = { total: 0, pending: 0, generating: 0, review: 0, published: 0 };

    for (const task of this.state.currentQueue) {
      stats.total++;
      stats[task.status]++;
    }

    return stats;
  }
}

// ============================================================================
// AUTOPILOT INTEGRATION - Generate content from topics using the Queue System
// ============================================================================

// Re-export RequestPriority for AutoPilot routes
export { RequestPriority } from '../ai/request-queue';

export interface TopicGenerationOptions {
  topic: string;
  contentType: 'attraction' | 'hotel' | 'dining' | 'article' | 'district' | 'event';
  destination?: string;
  tone?: 'professional' | 'friendly' | 'luxury' | 'casual';
  locale?: string;
  priority?: RequestPriority;
}

export interface TopicGenerationResult {
  success: boolean;
  title: string;
  slug: string;
  content: string;
  metadata: {
    description: string;
    keywords: string[];
    wordCount: number;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
  processingTime: number;
  error?: string;
}

/**
 * Generate content from a topic using the AI Queue System
 * This is the integration point for AutoPilot
 */
export async function generateFromTopic(options: TopicGenerationOptions): Promise<TopicGenerationResult> {
  const startTime = Date.now();
  const destination = options.destination || 'Dubai';
  const tone = options.tone || 'professional';
  const priority = options.priority || RequestPriority.NORMAL;
  
  factoryLogger.info('Generating content from topic', { 
    topic: options.topic, 
    type: options.contentType,
    destination,
    priority: RequestPriority[priority] || priority 
  });

  try {
    const userPrompt = buildTopicPrompt(options.topic, options.contentType, destination, tone);
    
    const systemMessage = `You are an expert travel content writer specializing in ${destination}. 
Write comprehensive, SEO-optimized content that helps travelers plan their trips.
Always include practical information, insider tips, and local insights.
Format the response as JSON with the following structure:
{
  "title": "...",
  "metaTitle": "... (50-60 characters)",
  "metaDescription": "... (150-160 characters)",
  "content": "... (HTML formatted article, 1800-3500 words)",
  "keywords": ["keyword1", "keyword2", ...],
  "faq": [{"question": "...", "answer": "..."}, ...]
}`;

    const result = await queuedAIRequest({
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt }
      ],
      maxTokens: 4000,
      temperature: 0.7,
      responseFormat: { type: 'json_object' },
    }, priority);

    let parsed: any;
    try {
      // Try parsing the content directly first (responseFormat: json_object should return valid JSON)
      parsed = JSON.parse(result.content);
    } catch {
      // Fallback: Try extracting JSON from the response using regex
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        factoryLogger.warn('Failed to parse AI response as JSON, using raw content');
        parsed = {
          title: options.topic,
          metaTitle: options.topic.substring(0, 60),
          metaDescription: `Discover ${options.topic} in ${destination}`,
          content: result.content,
          keywords: [options.topic, destination],
          faq: [],
        };
      }
    }

    const slug = generateSlug(parsed.title || options.topic);
    const wordCount = (parsed.content || '').split(/\s+/).length;

    return {
      success: true,
      title: parsed.title || options.topic,
      slug,
      content: parsed.content || result.content,
      metadata: {
        description: parsed.metaDescription || '',
        keywords: parsed.keywords || [],
        wordCount,
      },
      seo: {
        metaTitle: parsed.metaTitle || parsed.title || options.topic,
        metaDescription: parsed.metaDescription || '',
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error: any) {
    factoryLogger.error('Failed to generate content from topic', { 
      topic: options.topic, 
      error: error.message 
    });
    
    return {
      success: false,
      title: options.topic,
      slug: generateSlug(options.topic),
      content: '',
      metadata: { description: '', keywords: [], wordCount: 0 },
      seo: { metaTitle: '', metaDescription: '' },
      processingTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

function buildTopicPrompt(topic: string, contentType: string, destination: string, tone: string): string {
  const toneInstructions = {
    professional: 'Use a professional, authoritative tone with accurate facts and figures.',
    friendly: 'Use a warm, conversational tone that feels like advice from a friend.',
    luxury: 'Use an elegant, sophisticated tone highlighting premium experiences.',
    casual: 'Use a relaxed, casual tone that appeals to budget-conscious travelers.',
  };

  return `Write a comprehensive travel guide about "${topic}" in ${destination}.

Content Type: ${contentType}
Tone: ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}

Requirements:
1. META TITLE: Exactly 50-60 characters, include primary keyword and year
2. META DESCRIPTION: Exactly 150-160 characters, compelling with CTA
3. H1: Engaging title with primary keyword
4. STRUCTURE: 4-6 H2 sections with 200-300 words each
5. PRACTICAL INFO: Address, hours, prices, how to get there
6. TIPS: 5-7 insider tips that save time or money
7. FAQ: 5-7 frequently asked questions with concise answers
8. WORD COUNT: 1800-3500 words total

Focus on providing real value to travelers planning to visit ${destination}.
Include specific details, prices in AED/USD, and practical recommendations.`;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

// ============================================================================
// SINGLETON FACTORY INSTANCE
// ============================================================================

let factoryInstance: ContentFactory | null = null;

export function getContentFactory(config?: Partial<FactoryConfig>): ContentFactory {
  if (!factoryInstance) {
    factoryInstance = new ContentFactory(config);
  }
  return factoryInstance;
}

export function resetContentFactory(): void {
  if (factoryInstance) {
    factoryInstance.stop();
    factoryInstance = null;
  }
}
