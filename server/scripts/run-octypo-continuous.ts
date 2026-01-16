/**
 * Octypo Continuous Generation Script
 * Runs in batches until all attractions have content
 */

import { db } from '../db';
import { tiqetsAttractions } from '@shared/schema';
import { eq, isNull, lt, or } from 'drizzle-orm';
import { getOctypoOrchestrator, OctypoOrchestrator } from '../octypo';
import { AttractionData, GeneratedContent, QualityScore } from '../octypo/types';
import pLimit from 'p-limit';

const PARALLEL_LIMIT = 15;
const BATCH_SIZE = 100;
const QUALITY_THRESHOLD = 85;

async function getAttractionsBatch(): Promise<(AttractionData & { originalId: string })[]> {
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
    .limit(BATCH_SIZE);

  return attractions.map((a, idx) => ({
    id: idx,
    originalId: a.id,
    title: a.title || 'Unknown',
    cityName: a.cityName || 'Dubai',
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

function mapContent(content: GeneratedContent) {
  const parseSection = (text: string, icon: string) => {
    if (!text) return [];
    return text.split('\n').filter(l => l.trim()).map(line => {
      const match = line.match(/^([^:]+):\s*(.+)/);
      return match 
        ? { title: match[1].trim(), description: match[2].trim(), icon }
        : { title: 'Info', description: line.trim(), icon };
    });
  };

  const parseTransport = (text: string) => {
    if (!text) return [];
    const modes = ['metro', 'taxi', 'car', 'bus', 'ferry', 'tram'];
    return modes
      .map(key => {
        const match = text.match(new RegExp(`${key}[:\\s]+([^.]+)`, 'i'));
        return match ? { mode: key.charAt(0).toUpperCase() + key.slice(1), details: match[1].trim() } : null;
      })
      .filter(Boolean) as Array<{ mode: string; details: string }>;
  };

  return {
    introduction: content.introduction || '',
    whyVisit: content.introduction?.substring(0, 300) || '',
    proTip: content.honestLimitations?.[0] || '',
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
  await db.update(tiqetsAttractions).set({
    aiContent: mapContent(content),
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
  }).where(eq(tiqetsAttractions.id, id));
}

async function processBatch(orchestrator: OctypoOrchestrator, attractions: (AttractionData & { originalId: string })[]) {
  const limit = pLimit(PARALLEL_LIMIT);
  let success = 0, failed = 0, highQuality = 0;

  const tasks = attractions.map(a => limit(async () => {
    try {
      const result = await orchestrator.generateAttractionContent(a);
      if (result.success && result.content && result.qualityScore) {
        await saveContent(a.originalId, result.content, result.qualityScore);
        success++;
        if (result.qualityScore.overallScore >= QUALITY_THRESHOLD) {
          highQuality++;
          console.log(`✓ ${a.title.substring(0, 50)}... Score: ${result.qualityScore.overallScore}`);
        }
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
      console.error(`✗ ${a.title.substring(0, 30)}: ${e instanceof Error ? e.message : 'Error'}`);
    }
  }));

  await Promise.all(tasks);
  return { success, failed, highQuality };
}

async function run() {
  console.log(`\n🚀 Continuous generation started (${PARALLEL_LIMIT} parallel, ${BATCH_SIZE} per batch)\n`);
  
  const orchestrator = getOctypoOrchestrator({ maxRetries: 2, qualityThreshold: 80 });
  await orchestrator.initialize();
  
  let totalSuccess = 0, totalHQ = 0, batchNum = 0;
  const startTime = Date.now();
  
  while (true) {
    const attractions = await getAttractionsBatch();
    if (attractions.length === 0) {
      console.log('\n✅ All attractions processed!');
      break;
    }
    
    batchNum++;
    console.log(`\n--- Batch ${batchNum}: ${attractions.length} attractions ---`);
    
    const result = await processBatch(orchestrator, attractions);
    totalSuccess += result.success;
    totalHQ += result.highQuality;
    
    const elapsed = (Date.now() - startTime) / 1000 / 60;
    const rate = totalSuccess / elapsed;
    
    console.log(`Batch ${batchNum}: +${result.highQuality} HQ | Total: ${totalHQ} HQ | Rate: ${rate.toFixed(1)}/min`);
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  COMPLETED: ${totalHQ} high-quality articles`);
  console.log(`  Duration: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`);
  console.log(`═══════════════════════════════════════\n`);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
