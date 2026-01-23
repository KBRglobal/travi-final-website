/**
 * Octypo Job Handler
 * Connects job queue to real Octypo content generation engine
 * Persists all data to actual database tables
 */

import { jobQueue } from '../job-queue';
import { generateAttractionWithOctypo } from './index';
import { db } from '../db';
import { rssFeeds, contents, attractions, articles, destinations, backgroundJobs } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { AttractionData, GeneratedAttractionContent } from './types';
import { rssReader, isSensitiveTopic, detectDestinationFromContent, FeedItem } from './rss-reader';
import { OctypoOrchestrator } from './orchestration/orchestrator';
import { generatePilotContent, type PilotGenerationRequest } from './pilot/localization-pilot';

interface RSSJobData {
  jobType: 'rss-content-generation';
  feedId: string;
  feedUrl: string;
  feedName: string;
  destination?: string;
  category?: string;
  locale?: 'en' | 'ar' | 'fr'; // Optional target locale for content generation
}

interface TopicJobData {
  jobType: 'topic-content-generation';
  keywords: string[];
  destination?: string;
  quantity: number;
}

interface ManualJobData {
  jobType: 'manual-content-generation';
  title: string;
  description?: string;
  destination?: string;
}

type OctypoJobData = RSSJobData | TopicJobData | ManualJobData;

async function getDestinationCoordinates(destinationId: string): Promise<{ lat: number; lng: number } | null> {
  // Note: destinations table doesn't have lat/lng columns - return null
  // Coordinates can be added to the destination data structure if needed later
  return null;
}

async function saveGeneratedContent(
  title: string,
  slug: string,
  destinationId: string,
  category: string,
  content: GeneratedAttractionContent,
  jobId?: string
): Promise<{ contentId: string; attractionId: string }> {
  // Calculate word count from content sections
  const calculatedWordCount = [
    content.introduction,
    content.whatToExpect,
    content.visitorTips,
    content.howToGetThere,
  ].filter(Boolean).join(' ').split(/\s+/).length;

  const [contentRecord] = await db.insert(contents)
    .values({
      type: 'attraction',
      status: 'draft',
      title: title,
      slug: slug,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      summary: content.introduction?.substring(0, 200),
      answerCapsule: content.answerCapsule,
      blocks: [
        { type: 'text', content: content.introduction || '' },
        { type: 'text', content: content.whatToExpect || '' },
        { type: 'text', content: content.visitorTips || '' },
        { type: 'text', content: content.howToGetThere || '' },
      ],
      seoSchema: content.schemaPayload,
      generatedByAI: true,
      octopusJobId: jobId,
      wordCount: calculatedWordCount,
    } as any)
    .returning();

  const [attractionRecord] = await db.insert(attractions)
    .values({
      contentId: contentRecord.id,
      destinationId: destinationId,
      category: category,
      introText: content.introduction,
      expandedIntroText: content.whatToExpect,
      visitorTips: content.visitorTips ? [content.visitorTips] : [],
      faq: content.faqs || [],
    } as any)
    .returning();

  console.log(`[OctypoJobHandler] Saved content: ${contentRecord.id}, attraction: ${attractionRecord.id}`);
  
  return { contentId: contentRecord.id, attractionId: attractionRecord.id };
}

async function saveGeneratedArticle(
  title: string,
  slug: string,
  destinationId: string,
  category: string,
  content: GeneratedAttractionContent,
  feedId: string,
  sourceUrl?: string,
  jobId?: string
): Promise<{ contentId: string; articleId: string }> {
  // Calculate word count from content sections
  const calculatedWordCount = [
    content.introduction,
    content.whatToExpect,
    content.visitorTips,
  ].filter(Boolean).join(' ').split(/\s+/).length;

  const [contentRecord] = await db.insert(contents)
    .values({
      type: 'article',
      status: 'published',
      title: title,
      slug: slug,
      metaTitle: content.metaTitle || title,
      metaDescription: content.metaDescription || content.introduction?.substring(0, 160),
      summary: content.introduction?.substring(0, 200),
      answerCapsule: content.answerCapsule,
      blocks: [
        { type: 'text', contents: { text: content.introduction || '' } },
        { type: 'text', contents: { text: content.whatToExpect || '' } },
        { type: 'text', contents: { text: content.visitorTips || '' } },
      ].filter(b => b.contents.text),
      seoSchema: content.schemaPayload,
      generatedByAI: true,
      octopusJobId: jobId,
      wordCount: calculatedWordCount,
      publishedAt: new Date(),
    } as any)
    .returning();

  const [articleRecord] = await db.insert(articles)
    .values({
      contentId: contentRecord.id,
      category: category,
      sourceRssFeedId: feedId,
      sourceUrl: sourceUrl,
      excerpt: content.introduction?.substring(0, 200),
      publishDate: new Date(),
      relatedDestinationIds: [destinationId],
      faq: content.faqs || [],
    } as any)
    .returning();

  console.log(`[OctypoJobHandler] Saved article: ${contentRecord.id}, article: ${articleRecord.id}`);
  
  return { contentId: contentRecord.id, articleId: articleRecord.id };
}

async function updateJobStatus(jobId: string, status: 'completed' | 'failed', result?: unknown, error?: string): Promise<void> {
  try {
    await db.update(backgroundJobs)
      .set({
        status,
        result: result,
        error: error,
        completedAt: new Date(),
      } as any)
      .where(eq(backgroundJobs.id, jobId));
  } catch (err) {
    console.error(`[OctypoJobHandler] Failed to update job status:`, err);
  }
}

// NOTE: fetchRSSItems, isSensitiveTopic, and detectDestinationFromContent
// are now imported from ./rss-reader.ts

async function processRSSJob(data: RSSJobData, jobId?: string): Promise<{ success: boolean; generated: number; skipped: number; errors: string[]; contentIds: string[] }> {
  console.log(`[OctypoJobHandler] Processing RSS job for feed: ${data.feedName}`);

  const [feed] = await db.select()
    .from(rssFeeds)
    .where(eq(rssFeeds.id, data.feedId))
    .limit(1);

  if (!feed) {
    return { success: false, generated: 0, skipped: 0, errors: ['RSS feed not found in database'], contentIds: [] };
  }

  // Step 1: Fetch and store new items using the proper RSS parser
  const fetchResult = await rssReader.fetchFeed(feed.id);
  if (fetchResult.errors.length > 0) {
    console.log(`[OctypoJobHandler] Feed fetch had errors:`, fetchResult.errors);
  }

  console.log(`[OctypoJobHandler] Fetched ${fetchResult.itemsFetched} items, ${fetchResult.newItems} new`);

  // Step 2: Get unprocessed items from the database
  const items = await rssReader.getUnprocessedItems(10, feed.id);
  if (items.length === 0) {
    console.log(`[OctypoJobHandler] No unprocessed items found`);
    return { success: true, generated: 0, skipped: 0, errors: [], contentIds: [] };
  }

  console.log(`[OctypoJobHandler] Processing ${items.length} unprocessed items`);

  const defaultDestinationId = data.destination || feed.destinationId || null;
  const targetLocale = data.locale || 'en'; // Default to English

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const contentIds: string[] = [];

  for (const item of items) {
    try {
      // Check for sensitive topics
      const sensitivityCheck = isSensitiveTopic(item.title, item.summary);
      if (sensitivityCheck.sensitive) {
        console.log(`[OctypoJobHandler] Skipping sensitive topic: "${item.title}" - ${sensitivityCheck.reason}`);
        await rssReader.markProcessed(item.id); // Mark as processed to skip in future
        skipped++;
        continue;
      }

      // Detect destination from content
      const detectedDestination = detectDestinationFromContent(item.title, item.summary);
      const destinationId = detectedDestination || defaultDestinationId || 'global';
      console.log(`[OctypoJobHandler] Detected destination: ${destinationId} for "${item.title.substring(0, 50)}..."`);

      // Generate slug and check for duplicates
      const slug = item.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);

      const existingSlug = await db.select({ id: contents.id })
        .from(contents)
        .where(eq(contents.slug, slug))
        .limit(1);

      if (existingSlug.length > 0) {
        console.log(`[OctypoJobHandler] Skipping duplicate slug: ${slug}`);
        await rssReader.markProcessed(item.id);
        skipped++;
        continue;
      }

      const coords = await getDestinationCoordinates(destinationId);

      const attractionData: AttractionData = {
        id: Date.now(),
        title: item.title,
        cityName: destinationId,
        tiqetsDescription: item.summary,
        primaryCategory: data.category || feed.category || 'news',
        secondaryCategories: [],
        address: '',
        coordinates: coords || undefined,
      };

      let contentId: string | undefined;

      // Try locale-aware generation for supported locales (en, ar, fr)
      if (targetLocale === 'en' || targetLocale === 'ar' || targetLocale === 'fr') {
        try {
          const pilotRequest: PilotGenerationRequest = {
            entityType: 'attraction',
            entityId: item.id,
            destination: destinationId,
            locale: targetLocale,
          };

          const pilotResult = await generatePilotContent(pilotRequest, attractionData);

          if (pilotResult.success && pilotResult.contentId) {
            // Save as article in contents table
            const saved = await saveGeneratedArticle(
              item.title,
              slug,
              destinationId,
              data.category || feed.category || 'news',
              {
                introduction: '', // Will be filled from pilot content
                whatToExpect: '',
                visitorTips: '',
                howToGetThere: '',
                faqs: [],
                answerCapsule: '',
                metaTitle: item.title,
                metaDescription: item.summary.substring(0, 160),
              },
              feed.id,
              item.url,
              jobId
            );

            contentId = saved.contentId;
            contentIds.push(contentId);
            console.log(`[OctypoJobHandler] Generated locale-aware content (${targetLocale}) for: ${item.title}`);
            generated++;
          } else {
            // Fall back to standard generation
            console.log(`[OctypoJobHandler] Pilot generation failed, falling back to standard: ${pilotResult.failureReason}`);
            throw new Error('Fallback to standard generation');
          }
        } catch (pilotError) {
          // Fall back to standard generation
          console.log(`[OctypoJobHandler] Using standard generation for: ${item.title}`);

          const result = await generateAttractionWithOctypo(attractionData);

          if (result.success && result.content) {
            const saved = await saveGeneratedArticle(
              item.title,
              slug,
              destinationId,
              data.category || feed.category || 'news',
              result.content,
              feed.id,
              item.url,
              jobId
            );

            contentId = saved.contentId;
            contentIds.push(contentId);
            console.log(`[OctypoJobHandler] Generated standard content for: ${item.title}`);
            generated++;
          } else {
            errors.push(`Failed to generate for: ${item.title} - ${result.error || 'Unknown error'}`);
          }
        }
      } else {
        // Standard generation for non-pilot locales
        const result = await generateAttractionWithOctypo(attractionData);

        if (result.success && result.content) {
          const saved = await saveGeneratedArticle(
            item.title,
            slug,
            destinationId,
            data.category || feed.category || 'news',
            result.content,
            feed.id,
            item.url,
            jobId
          );

          contentId = saved.contentId;
          contentIds.push(contentId);
          console.log(`[OctypoJobHandler] Generated content for: ${item.title}`);
          generated++;
        } else {
          errors.push(`Failed to generate for: ${item.title} - ${result.error || 'Unknown error'}`);
        }
      }

      // Mark item as processed
      await rssReader.markProcessed(item.id, contentId);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Error processing: ${item.title} - ${errorMsg}`);
    }
  }

  console.log(`[OctypoJobHandler] RSS job complete - Generated: ${generated}, Skipped: ${skipped}, Errors: ${errors.length}`);
  return { success: generated > 0 || skipped > 0, generated, skipped, errors, contentIds };
}

async function processTopicJob(data: TopicJobData, jobId?: string): Promise<{ success: boolean; generated: number; errors: string[]; contentIds: string[] }> {
  console.log(`[OctypoJobHandler] Processing topic job for keywords: ${data.keywords.join(', ')}`);
  
  // FAIL-FAST: Destination is required - no silent defaults
  if (!data.destination) {
    const error = '[OctypoJobHandler] FAIL: destination is required for topic job - no implicit defaults allowed';
    console.error(error);
    return { success: false, generated: 0, errors: [error], contentIds: [] };
  }
  
  const destinationId = data.destination;
  const coords = await getDestinationCoordinates(destinationId);
  
  let generated = 0;
  const errors: string[] = [];
  const contentIds: string[] = [];
  
  for (const keyword of data.keywords) {
    try {
      const slug = keyword.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);
      
      const existingSlug = await db.select({ id: contents.id })
        .from(contents)
        .where(eq(contents.slug, slug))
        .limit(1);
      
      if (existingSlug.length > 0) {
        console.log(`[OctypoJobHandler] Skipping duplicate slug: ${slug}`);
        continue;
      }
      
      const attractionData: AttractionData = {
        id: Date.now(),
        title: keyword,
        cityName: destinationId,
        primaryCategory: 'attractions',
        secondaryCategories: [],
        address: '',
        coordinates: coords || undefined,
      };
      
      const result = await generateAttractionWithOctypo(attractionData);
      
      if (result.success && result.content) {
        const saved = await saveGeneratedContent(
          keyword,
          slug,
          destinationId,
          'attractions',
          result.content,
          jobId
        );
        
        contentIds.push(saved.contentId);
        console.log(`[OctypoJobHandler] Generated and saved content for topic: ${keyword}`);
        generated++;
      } else {
        errors.push(`Failed to generate for topic: ${keyword} - ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Error processing topic: ${keyword} - ${errorMsg}`);
    }
  }
  
  return { success: generated > 0, generated, errors, contentIds };
}

async function processManualJob(data: ManualJobData, jobId?: string): Promise<{ success: boolean; generated: number; errors: string[]; contentIds: string[] }> {
  console.log(`[OctypoJobHandler] Processing manual job for: ${data.title}`);
  
  // FAIL-FAST: Destination is required - no silent defaults
  if (!data.destination) {
    const error = '[OctypoJobHandler] FAIL: destination is required for manual job - no implicit defaults allowed';
    console.error(error);
    return { success: false, generated: 0, errors: [error], contentIds: [] };
  }
  
  const destinationId = data.destination;
  const coords = await getDestinationCoordinates(destinationId);
  
  try {
    const slug = data.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
    
    const existingSlug = await db.select({ id: contents.id })
      .from(contents)
      .where(eq(contents.slug, slug))
      .limit(1);
    
    if (existingSlug.length > 0) {
      return { success: false, generated: 0, errors: ['Content with this title already exists'], contentIds: [] };
    }
    
    const attractionData: AttractionData = {
      id: Date.now(),
      title: data.title,
      cityName: destinationId,
      tiqetsDescription: data.description || data.title,
      primaryCategory: 'attractions',
      secondaryCategories: [],
      address: '',
      coordinates: coords || undefined,
    };
    
    const result = await generateAttractionWithOctypo(attractionData);
    
    if (result.success && result.content) {
      const saved = await saveGeneratedContent(
        data.title,
        slug,
        destinationId,
        'attractions',
        result.content,
        jobId
      );
      
      console.log(`[OctypoJobHandler] Generated and saved content for: ${data.title}`);
      return { success: true, generated: 1, errors: [], contentIds: [saved.contentId] };
    } else {
      return { success: false, generated: 0, errors: [result.error || 'Unknown error'], contentIds: [] };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, generated: 0, errors: [errorMsg], contentIds: [] };
  }
}

async function handleOctypoJob(data: OctypoJobData, jobId?: string): Promise<{ success: boolean; result: unknown }> {
  console.log(`[OctypoJobHandler] Processing job type: ${data.jobType}`);
  
  let result: { success: boolean; generated: number; errors: string[]; contentIds: string[] };
  
  switch (data.jobType) {
    case 'rss-content-generation':
      result = await processRSSJob(data, jobId);
      break;
    case 'topic-content-generation':
      result = await processTopicJob(data, jobId);
      break;
    case 'manual-content-generation':
      result = await processManualJob(data, jobId);
      break;
    default:
      console.error(`[OctypoJobHandler] Unknown job type: ${(data as any).jobType}`);
      result = { success: false, generated: 0, errors: ['Unknown job type'], contentIds: [] };
  }
  
  console.log(`[OctypoJobHandler] Job complete - Generated: ${result.generated}, Saved: ${result.contentIds.length}, Errors: ${result.errors.length}`);
  
  if (jobId) {
    await updateJobStatus(
      jobId,
      result.success ? 'completed' : 'failed',
      { generated: result.generated, contentIds: result.contentIds },
      result.errors.length > 0 ? result.errors.join('; ') : undefined
    );
  }
  
  return {
    success: result.success,
    result: {
      generated: result.generated,
      contentIds: result.contentIds,
      errors: result.errors,
    },
  };
}

export function registerOctypoJobHandler(): void {
  console.log('[OctypoJobHandler] Registering Octypo content generation handler');
  
  jobQueue.registerHandler<OctypoJobData>('ai_generate', async (data) => {
    return handleOctypoJob(data as OctypoJobData);
  });
  
  console.log('[OctypoJobHandler] Handler registered successfully');
  
  jobQueue.start();
  console.log('[OctypoJobHandler] Job queue processing started');
}

export async function manuallyProcessJob(jobId: string): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    const job = await jobQueue.getJob(jobId);
    if (!job) {
      return { success: false, error: 'Job not found' };
    }
    
    if (job.type !== 'ai_generate') {
      return { success: false, error: `Unsupported job type: ${job.type}` };
    }
    
    await db.update(backgroundJobs)
      .set({ status: 'processing', startedAt: new Date() } as any)
      .where(eq(backgroundJobs.id, jobId));
    
    const result = await handleOctypoJob(job.data as OctypoJobData, jobId);
    return { success: result.success, result: result.result };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    await updateJobStatus(jobId, 'failed', undefined, errorMsg);
    
    return { success: false, error: errorMsg };
  }
}
