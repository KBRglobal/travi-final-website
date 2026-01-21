/**
 * Octypo Generation Script (Sequential)
 * Generates attractions with quality validation using the octypo system
 */

import { db } from '../db';
import { tiqetsAttractions } from '@shared/schema';
import { eq, isNull, lt, or } from 'drizzle-orm';
import { getOctypoOrchestrator } from '../octypo';
import { AttractionData } from '../octypo/types';
type GeneratedContent = any;
type QualityScore = any;

interface GenerationStats {
  total: number;
  successful: number;
  failed: number;
  averageScore: number;
  highQuality: number;
  startTime: Date;
  endTime?: Date;
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
        lt(tiqetsAttractions.seoScore, 85)
      )
    )
    .limit(limit);

  // FAIL-FAST: Filter out attractions without cityName - no implicit defaults
  return attractions
    .filter(a => {
      if (!a.cityName) {
        console.warn(`[OctypoGeneration] Skipping attraction ${a.id} - no cityName (no implicit defaults)`);
        return false;
      }
      return true;
    })
    .map((a, idx) => ({
    id: idx,
    originalId: a.id,
    title: a.title || 'Unknown Attraction',
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
        items.push({ title: colonMatch[1].trim(), description: colonMatch[2].trim(), icon: defaultIcon });
      } else if (line.trim()) {
        items.push({ title: 'Highlight', description: line.trim(), icon: defaultIcon });
      }
    }
    
    return items.length > 0 ? items : [{ title: 'Overview', description: text.trim(), icon: defaultIcon }];
  };

  const parseTransport = (text: string): Array<{ mode: string; details: string }> => {
    if (!text) return [];
    const transport: Array<{ mode: string; details: string }> = [];
    
    const modes = [
      { key: 'metro', mode: 'Metro' },
      { key: 'taxi', mode: 'Taxi' },
      { key: 'car', mode: 'Car' },
      { key: 'bus', mode: 'Bus' },
      { key: 'ferry', mode: 'Ferry' },
      { key: 'tram', mode: 'Tram' },
    ];
    
    for (const { key, mode } of modes) {
      const regex = new RegExp(`${key}[:\\s]+([^.]+)`, 'i');
      const match = text.match(regex);
      if (match) transport.push({ mode, details: match[1].trim() });
    }
    
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

async function saveGeneratedContent(
  attractionId: string,
  content: GeneratedContent,
  qualityScore: QualityScore
): Promise<void> {
  const aiContent = mapContentToAiContent(content);

  await db
    .update(tiqetsAttractions)
    .set({
      aiContent,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      faqs: content.faqs,
      description: content.introduction,
      seoScore: qualityScore.seoScore,
      aeoScore: qualityScore.aeoScore,
      factCheckScore: qualityScore.factCheckScore,
      qualityScore: qualityScore.overallScore,
      contentVersion: 2,
      lastContentUpdate: new Date(),
      contentGenerationStatus: 'completed',
      contentGenerationCompletedAt: new Date(),
    } as any)
    .where(eq(tiqetsAttractions.id, attractionId));
}

async function runGeneration(targetCount: number = 100): Promise<GenerationStats> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OCTYPO CONTENT GENERATION SYSTEM');
  console.log(`  Target: ${targetCount} attractions with 85+ quality scores`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  const stats: GenerationStats = {
    total: 0,
    successful: 0,
    failed: 0,
    averageScore: 0,
    highQuality: 0,
    startTime: new Date(),
  };

  const orchestrator = getOctypoOrchestrator({ maxRetries: 3, qualityThreshold: 85 });
  await orchestrator.initialize();

  const attractionsRaw = await getAttractionsToGenerate(targetCount + 50);
  console.log(`\nFound ${attractionsRaw.length} attractions to process\n`);

  const scores: number[] = [];

  for (const attraction of attractionsRaw) {
    if (stats.highQuality >= targetCount) {
      console.log(`\n✅ Reached target of ${targetCount} high-quality articles!`);
      break;
    }

    stats.total++;
    console.log(`\n[${stats.total}/${targetCount}] Processing: ${attraction.title}`);
    console.log(`  City: ${attraction.cityName} | Category: ${attraction.primaryCategory || 'General'}`);

    try {
      const result = await orchestrator.generateAttractionContent(attraction);

      if (result.success && result.content && result.qualityScore) {
        const score = result.qualityScore.overallScore;
        scores.push(score);

        console.log(`  ✓ Generated in ${result.generationTimeMs}ms`);
        console.log(`  Score: ${score} (SEO=${result.qualityScore.seoScore}, AEO=${result.qualityScore.aeoScore})`);
        console.log(`  Writer: ${result.writerId} | Retries: ${result.retryCount}`);

        await saveGeneratedContent(attraction.originalId, result.content, result.qualityScore);
        stats.successful++;

        if (score >= 85) {
          stats.highQuality++;
          console.log(`  🎯 High quality! (${stats.highQuality}/${targetCount})`);
        }
      } else {
        stats.failed++;
        console.log(`  ✗ Generation failed`);
      }
    } catch (error) {
      stats.failed++;
      console.error(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    if (stats.total % 10 === 0) {
      const elapsed = (Date.now() - stats.startTime.getTime()) / 1000 / 60;
      const rate = stats.total / elapsed;
      console.log(`\n--- Progress: ${stats.highQuality}/${targetCount} high-quality | ${rate.toFixed(1)} articles/min ---\n`);
    }
  }

  stats.endTime = new Date();
  stats.averageScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
    : 0;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  GENERATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total processed: ${stats.total}`);
  console.log(`  Successful: ${stats.successful}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  High quality (85+): ${stats.highQuality}`);
  console.log(`  Average score: ${stats.averageScore}`);
  console.log(`  Duration: ${((stats.endTime.getTime() - stats.startTime.getTime()) / 1000 / 60).toFixed(1)} minutes`);
  console.log('═══════════════════════════════════════════════════════════════');

  return stats;
}

const targetCount = parseInt(process.argv[2] || '100', 10);
runGeneration(targetCount)
  .then(stats => {
    if (stats.highQuality >= targetCount) {
      console.log(`\n🎉 SUCCESS: Generated ${stats.highQuality} high-quality articles!`);
      process.exit(0);
    } else {
      console.log(`\n⚠️ Partial success: ${stats.highQuality}/${targetCount} high-quality articles`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  });
