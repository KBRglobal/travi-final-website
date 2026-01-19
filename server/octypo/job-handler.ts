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

interface RSSJobData {
  jobType: 'rss-content-generation';
  feedId: string;
  feedUrl: string;
  feedName: string;
  destination?: string;
  category?: string;
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
  try {
    const [dest] = await db.select({
      latitude: destinations.latitude,
      longitude: destinations.longitude,
    })
      .from(destinations)
      .where(eq(destinations.id, destinationId))
      .limit(1);
    
    if (dest && dest.latitude && dest.longitude) {
      return { lat: Number(dest.latitude), lng: Number(dest.longitude) };
    }
    return null;
  } catch {
    return null;
  }
}

async function saveGeneratedContent(
  title: string,
  slug: string,
  destinationId: string,
  category: string,
  content: GeneratedAttractionContent,
  jobId?: string
): Promise<{ contentId: string; attractionId: string }> {
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
      wordCount: content.wordCount || 0,
    })
    .returning();

  const [attractionRecord] = await db.insert(attractions)
    .values({
      contentId: contentRecord.id,
      destinationId: destinationId,
      category: category,
      introText: content.introduction,
      expandedIntroText: content.whatToExpect,
      visitorTips: content.visitorTips ? [content.visitorTips] : [],
      faq: content.faq || [],
    })
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
      wordCount: content.wordCount || 0,
      publishedAt: new Date(),
    })
    .returning();

  const [articleRecord] = await db.insert(articles)
    .values({
      contentId: contentRecord.id,
      category: category as any,
      sourceRssFeedId: feedId,
      sourceUrl: sourceUrl,
      excerpt: content.introduction?.substring(0, 200),
      publishDate: new Date(),
      relatedDestinationIds: [destinationId],
      faq: content.faq || [],
    })
    .returning();

  console.log(`[OctypoJobHandler] Saved article: ${contentRecord.id}, article: ${articleRecord.id}`);
  
  return { contentId: contentRecord.id, articleId: articleRecord.id };
}

async function updateJobStatus(jobId: string, status: 'completed' | 'failed', result?: unknown, error?: string): Promise<void> {
  try {
    await db.update(backgroundJobs)
      .set({
        status,
        result: result as any,
        error: error,
        completedAt: new Date(),
      })
      .where(eq(backgroundJobs.id, jobId));
  } catch (err) {
    console.error(`[OctypoJobHandler] Failed to update job status:`, err);
  }
}

async function fetchRSSItems(feedUrl: string): Promise<{ title: string; description: string; link: string; pubDate?: string }[]> {
  try {
    const response = await fetch(feedUrl);
    const text = await response.text();
    
    const items: { title: string; description: string; link: string; pubDate?: string }[] = [];
    const itemMatches = text.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
    
    for (const match of itemMatches) {
      const itemXml = match[1];
      const title = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1] || '';
      const description = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i)?.[1] || '';
      const link = itemXml.match(/<link[^>]*>(.*?)<\/link>/i)?.[1] || '';
      const pubDate = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)?.[1];
      
      if (title) {
        items.push({
          title: title.replace(/<[^>]+>/g, '').trim(),
          description: description.replace(/<[^>]+>/g, '').trim(),
          link: link.trim(),
          pubDate,
        });
      }
    }
    
    return items.slice(0, 10);
  } catch (error) {
    console.error(`[OctypoJobHandler] Failed to fetch RSS:`, error);
    return [];
  }
}

const SENSITIVE_TOPIC_KEYWORDS = [
  'kill', 'dead', 'death', 'die', 'dies', 'died', 'dying',
  'murder', 'murdered', 'homicide', 'manslaughter',
  'crash', 'collision', 'accident', 'fatal',
  'terror', 'terrorist', 'attack', 'bomb', 'bombing', 'explosion',
  'war', 'conflict', 'invasion', 'military strike',
  'disaster', 'tragedy', 'catastrophe',
  'shooting', 'shot', 'gunfire', 'gunman',
  'victim', 'victims', 'casualties',
  'hostage', 'kidnap', 'abduct',
  'suicide', 'suicide bombing',
  'epidemic', 'pandemic', 'outbreak', 'virus spread',
];

function isSensitiveTopic(title: string, description: string): { sensitive: boolean; reason?: string } {
  const combined = `${title} ${description}`.toLowerCase();
  
  for (const keyword of SENSITIVE_TOPIC_KEYWORDS) {
    if (combined.includes(keyword.toLowerCase())) {
      return { sensitive: true, reason: `Contains sensitive keyword: "${keyword}"` };
    }
  }
  
  return { sensitive: false };
}

const DESTINATION_KEYWORDS: Array<{ keywords: string[]; destinationId: string }> = [
  { keywords: ['japan', 'tokyo', 'osaka', 'kyoto', 'japanese', 'shinkansen'], destinationId: 'tokyo' },
  { keywords: ['thailand', 'bangkok', 'thai', 'phuket'], destinationId: 'bangkok' },
  { keywords: ['singapore', 'singaporean'], destinationId: 'singapore' },
  { keywords: ['dubai', 'uae', 'emirati', 'emirates', 'burj'], destinationId: 'dubai' },
  { keywords: ['abu dhabi', 'abu-dhabi'], destinationId: 'abu-dhabi' },
  { keywords: ['ras al khaimah', 'ras-al-khaimah'], destinationId: 'ras-al-khaimah' },
  { keywords: ['paris', 'france', 'french', 'eiffel'], destinationId: 'paris' },
  { keywords: ['london', 'britain', 'british', 'uk', 'england'], destinationId: 'london' },
  { keywords: ['istanbul', 'turkey', 'turkish'], destinationId: 'istanbul' },
  { keywords: ['new york', 'nyc', 'manhattan', 'brooklyn'], destinationId: 'new-york' },
  { keywords: ['los angeles', 'hollywood', 'california', 'la'], destinationId: 'los-angeles' },
  { keywords: ['miami', 'florida'], destinationId: 'miami' },
];

function detectDestinationFromContent(title: string, description: string): string | null {
  const combined = `${title} ${description}`.toLowerCase();
  
  for (const entry of DESTINATION_KEYWORDS) {
    if (entry.keywords.some(kw => combined.includes(kw.toLowerCase()))) {
      return entry.destinationId;
    }
  }
  
  return null;
}

async function processRSSJob(data: RSSJobData, jobId?: string): Promise<{ success: boolean; generated: number; skipped: number; errors: string[]; contentIds: string[] }> {
  console.log(`[OctypoJobHandler] Processing RSS job for feed: ${data.feedName}`);
  
  const [feed] = await db.select()
    .from(rssFeeds)
    .where(eq(rssFeeds.id, data.feedId))
    .limit(1);
  
  if (!feed) {
    return { success: false, generated: 0, skipped: 0, errors: ['RSS feed not found in database'], contentIds: [] };
  }
  
  const items = await fetchRSSItems(feed.url);
  if (items.length === 0) {
    return { success: false, generated: 0, skipped: 0, errors: ['No items found in RSS feed'], contentIds: [] };
  }
  
  console.log(`[OctypoJobHandler] Found ${items.length} items in feed`);
  
  const defaultDestinationId = data.destination || feed.destinationId || null;
  
  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const contentIds: string[] = [];
  
  for (const item of items) {
    try {
      const sensitivityCheck = isSensitiveTopic(item.title, item.description);
      if (sensitivityCheck.sensitive) {
        console.log(`[OctypoJobHandler] Skipping sensitive topic: "${item.title}" - ${sensitivityCheck.reason}`);
        skipped++;
        continue;
      }
      
      const detectedDestination = detectDestinationFromContent(item.title, item.description);
      const destinationId = detectedDestination || defaultDestinationId || 'global';
      console.log(`[OctypoJobHandler] Detected destination: ${destinationId} for "${item.title.substring(0, 50)}..."`);
      
      const coords = await getDestinationCoordinates(destinationId);
      
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
        continue;
      }
      
      const attractionData: AttractionData = {
        id: `rss-${feed.id}-${Date.now()}`,
        title: item.title,
        slug: slug,
        description: item.description || item.title,
        destinationId: destinationId,
        primaryCategory: data.category || feed.category || 'news',
        secondaryCategories: [],
        address: '',
        latitude: coords?.lat || 0,
        longitude: coords?.lng || 0,
        sourceUrl: item.link,
        locale: feed.language || 'en',
      };
      
      const result = await generateAttractionWithOctypo(attractionData);
      
      if (result.success && result.content) {
        const saved = await saveGeneratedArticle(
          item.title,
          slug,
          destinationId,
          data.category || feed.category || 'news',
          result.content,
          feed.id,
          item.link,
          jobId
        );
        
        contentIds.push(saved.contentId);
        console.log(`[OctypoJobHandler] Generated and saved article for: ${item.title}`);
        generated++;
      } else {
        errors.push(`Failed to generate for: ${item.title} - ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Error processing: ${item.title} - ${errorMsg}`);
    }
  }
  
  await db.update(rssFeeds)
    .set({ lastFetchedAt: new Date() })
    .where(eq(rssFeeds.id, feed.id));
  
  console.log(`[OctypoJobHandler] RSS job complete - Generated: ${generated}, Skipped: ${skipped}, Errors: ${errors.length}`);
  return { success: generated > 0 || skipped > 0, generated, skipped, errors, contentIds };
}

async function processTopicJob(data: TopicJobData, jobId?: string): Promise<{ success: boolean; generated: number; errors: string[]; contentIds: string[] }> {
  console.log(`[OctypoJobHandler] Processing topic job for keywords: ${data.keywords.join(', ')}`);
  
  const destinationId = data.destination || 'dubai';
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
        id: `topic-${destinationId}-${Date.now()}`,
        title: keyword,
        slug: slug,
        description: `Comprehensive guide about ${keyword}`,
        destinationId: destinationId,
        primaryCategory: 'attractions',
        secondaryCategories: [],
        address: '',
        latitude: coords?.lat || 25.2048,
        longitude: coords?.lng || 55.2708,
        locale: 'en',
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
  
  const destinationId = data.destination || 'dubai';
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
      id: `manual-${destinationId}-${Date.now()}`,
      title: data.title,
      slug: slug,
      description: data.description || data.title,
      destinationId: destinationId,
      primaryCategory: 'attractions',
      secondaryCategories: [],
      address: '',
      latitude: coords?.lat || 25.2048,
      longitude: coords?.lng || 55.2708,
      locale: 'en',
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
      .set({ status: 'processing', startedAt: new Date() })
      .where(eq(backgroundJobs.id, jobId));
    
    const result = await handleOctypoJob(job.data as OctypoJobData, jobId);
    return { success: result.success, result: result.result };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    await updateJobStatus(jobId, 'failed', undefined, errorMsg);
    
    return { success: false, error: errorMsg };
  }
}
