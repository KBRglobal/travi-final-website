/**
 * Octypo Parallel Generation Script
 * Generates attractions with maximum parallelism using all 69 engines
 * FIXED: Shared orchestrator, proper content mapping, word count validation
 */

import { db } from '../db';
import { tiqetsAttractions } from '@shared/schema';
import { eq, isNull, lt, or } from 'drizzle-orm';
import { getOctypoOrchestrator, OctypoOrchestrator } from '../octypo';
import { AttractionData } from '../octypo/types';
type GeneratedContent = any;
type QualityScore = any;
import pLimit from 'p-limit';

const PARALLEL_LIMIT = 10;
const QUALITY_THRESHOLD = 85;

interface Stats {
  total: number;
  successful: number;
  failed: number;
  highQuality: number;
  scores: number[];
  startTime: Date;
}

async function getAttractionsToGenerate(limit: number): Promise<(AttractionData & { originalId: string })[]> {
  const attractions = await db
    .select({
      id: tiqetsAttractions.id,
      title: tiqetsAttractions.title,
      cityName: tiqetsAttractions.cityName,
      venueName: tiqetsAttractions.venueName,
      duration: tiqetsAttractions.duration,
      primaryCategory: tiqetsAttractions.primaryCategory,
      secondaryCategories: tiqetsAttractions.secondaryCategories,
      languages: tiqetsAttractions.languages,
      wheelchairAccess: tiqetsAttractions.wheelchairAccess,
      tiqetsDescription: tiqetsAttractions.tiqetsDescription,
      tiqetsHighlights: tiqetsAttractions.tiqetsHighlights,
      priceUsd: tiqetsAttractions.priceUsd,
      tiqetsRating: tiqetsAttractions.tiqetsRating,
      tiqetsReviewCount: tiqetsAttractions.tiqetsReviewCount,
    })
    .from(tiqetsAttractions)
    .where(
      or(
        isNull(tiqetsAttractions.seoScore),
        lt(tiqetsAttractions.seoScore, QUALITY_THRESHOLD)
      )
    )
    .limit(limit);

  // FAIL-FAST: Filter out attractions without cityName - no implicit defaults
  return attractions
    .filter(a => {
      if (!a.cityName) {
        console.warn(`[OctypoParallel] Skipping attraction ${a.id} - no cityName (no implicit defaults)`);
        return false;
      }
      return true;
    })
    .map((a, idx) => ({
    id: idx,
    originalId: a.id,
    title: a.title || 'Unknown',
    cityName: a.cityName,
    venueName: a.venueName || undefined,
    duration: a.duration || undefined,
    primaryCategory: a.primaryCategory || undefined,
    secondaryCategories: a.secondaryCategories || undefined,
    languages: a.languages || undefined,
    wheelchairAccess: a.wheelchairAccess || false,
    tiqetsDescription: a.tiqetsDescription || undefined,
    tiqetsHighlights: a.tiqetsHighlights || undefined,
    priceFrom: a.priceUsd ? parseFloat(a.priceUsd) : undefined,
    rating: a.tiqetsRating ? parseFloat(a.tiqetsRating) : undefined,
    reviewCount: a.tiqetsReviewCount || undefined,
  }));
}

function mapContentToAiContent(content: GeneratedContent) {
  const parseSection = (text: string, defaultIcon: string): Array<{ title: string; description: string; icon: string }> => {
    if (!text) return [];
    const lines = text.split('\n').filter(l => l.trim());
    const items: Array<{ title: string; description: string; icon: string }> = [];
    
    for (const line of lines) {
      const colonMatch = line.match(/^([^:]+):\s*(.+)/);
      if (colonMatch) {
        items.push({
          title: colonMatch[1].trim(),
          description: colonMatch[2].trim(),
          icon: defaultIcon,
        });
      } else if (line.trim()) {
        items.push({
          title: 'Highlight',
          description: line.trim(),
          icon: defaultIcon,
        });
      }
    }
    
    return items.length > 0 ? items : [{ title: 'Overview', description: text.trim(), icon: defaultIcon }];
  };

  const parseTransport = (text: string): Array<{ mode: string; details: string }> => {
    if (!text) return [];
    const transport: Array<{ mode: string; details: string }> = [];
    
    const metroMatch = text.match(/metro[:\s]+([^.]+)/i);
    if (metroMatch) transport.push({ mode: 'Metro', details: metroMatch[1].trim() });
    
    const taxiMatch = text.match(/taxi[:\s]+([^.]+)/i);
    if (taxiMatch) transport.push({ mode: 'Taxi', details: taxiMatch[1].trim() });
    
    const carMatch = text.match(/car[:\s]+([^.]+)/i);
    if (carMatch) transport.push({ mode: 'Car', details: carMatch[1].trim() });
    
    const busMatch = text.match(/bus[:\s]+([^.]+)/i);
    if (busMatch) transport.push({ mode: 'Bus', details: busMatch[1].trim() });
    
    if (transport.length === 0) {
      transport.push({ mode: 'Various', details: text.substring(0, 200) });
    }
    
    return transport;
  };

  return {
    introduction: content.introduction || '',
    whyVisit: content.introduction?.substring(0, 300) || '',
    proTip: content.honestLimitations?.[0] || 'Check opening hours before visiting.',
    whatToExpect: parseSection(content.whatToExpect || '', 'star'),
    visitorTips: parseSection(content.visitorTips || '', 'lightbulb'),
    howToGetThere: {
      description: content.howToGetThere || '',
      transport: parseTransport(content.howToGetThere || ''),
    },
    answerCapsule: content.answerCapsule || '',
    schemaPayload: content.schemaPayload || {},
  };
}

async function saveContent(id: string, content: GeneratedContent, score: QualityScore): Promise<void> {
  const aiContent = mapContentToAiContent(content);
  
  await db.update(tiqetsAttractions).set({
    aiContent,
    metaTitle: content.metaTitle,
    metaDescription: content.metaDescription,
    faqs: content.faqs,
    description: content.introduction,
    seoScore: score.seoScore,
    aeoScore: score.aeoScore,
    factCheckScore: score.factCheckScore,
    qualityScore: score.overallScore,
    contentVersion: 2,
    lastContentUpdate: new Date(),
    contentGenerationStatus: 'completed',
    contentGenerationCompletedAt: new Date(),
  } as any).where(eq(tiqetsAttractions.id, id));
}

async function processAttraction(
  attraction: AttractionData & { originalId: string },
  orchestrator: OctypoOrchestrator,
  stats: Stats
): Promise<boolean> {
  try {
    const result = await orchestrator.generateAttractionContent(attraction);
    
    if (result.success && result.content && result.qualityScore) {
      await saveContent(attraction.originalId, result.content, result.qualityScore);
      stats.successful++;
      stats.scores.push(result.qualityScore.overallScore);
      
      if (result.qualityScore.overallScore >= QUALITY_THRESHOLD) {
        stats.highQuality++;
        console.log(`✓ [${stats.highQuality}] ${attraction.title.substring(0, 40)}... Score: ${result.qualityScore.overallScore}`);
        return true;
      } else {
        console.log(`○ ${attraction.title.substring(0, 30)}... Score: ${result.qualityScore.overallScore} (below threshold)`);
      }
    } else {
      stats.failed++;
      console.log(`✗ ${attraction.title.substring(0, 30)}... Failed`);
    }
  } catch (error) {
    stats.failed++;
    console.error(`✗ ${attraction.title.substring(0, 30)}: ${error instanceof Error ? error.message : 'Error'}`);
  }
  
  return false;
}

async function run(target: number): Promise<void> {
  console.log(`\n🚀 Starting parallel generation (${PARALLEL_LIMIT} concurrent, target: ${target})\n`);
  
  const stats: Stats = {
    total: 0,
    successful: 0,
    failed: 0,
    highQuality: 0,
    scores: [],
    startTime: new Date(),
  };

  const orchestrator = getOctypoOrchestrator({ maxRetries: 2, qualityThreshold: 80 });
  await orchestrator.initialize();
  
  const attractions = await getAttractionsToGenerate(Math.ceil(target * 1.5));
  console.log(`Found ${attractions.length} attractions\n`);
  
  if (attractions.length === 0) {
    console.log('No attractions found that need content generation.');
    return;
  }
  
  const limit = pLimit(PARALLEL_LIMIT);
  
  const tasks = attractions.map((attraction) => {
    stats.total++;
    return limit(() => processAttraction(attraction, orchestrator, stats));
  });
  
  await Promise.all(tasks);
  
  const duration = (Date.now() - stats.startTime.getTime()) / 1000 / 60;
  const avgScore = stats.scores.length > 0 
    ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) 
    : 0;
  
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  COMPLETED in ${duration.toFixed(1)} minutes`);
  console.log(`  Success: ${stats.successful}/${stats.total}`);
  console.log(`  High Quality (85+): ${stats.highQuality}`);
  console.log(`  Average Score: ${avgScore}`);
  console.log(`═══════════════════════════════════════\n`);
}

run(parseInt(process.argv[2] || '100', 10))
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
