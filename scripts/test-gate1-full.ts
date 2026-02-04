/**
 * Full Gate 1 Test - With LLM Evaluation
 */

import "dotenv/config";
import { rssReader } from "../server/octypo/rss-reader";
import { getGate1Selector } from "../server/octypo/gatekeeper/gate1-selector";
import { EngineRegistry } from "../server/services/engine-registry";

async function main() {
  console.log("🚀 Starting Full Gate 1 Test...\n");

  // Initialize
  await rssReader.initialize();

  // Check engine availability
  const engineStats = EngineRegistry.getStats();
  console.log(`🔧 Engines: ${engineStats.healthy}/${engineStats.total} healthy`);

  const providers = Object.entries(engineStats.byProvider)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => `${name}:${count}`)
    .join(", ");
  console.log(`   Active: ${providers || "none"}\n`);

  if (engineStats.healthy === 0) {
    console.log("❌ No healthy engines available. Check API keys in .env");
    console.log("   Need: ANTHROPIC_API_KEY, OPENAI_API_KEY, or similar");
    process.exit(1);
  }

  const gate1 = getGate1Selector();

  // Get 1 unprocessed item
  const items = await rssReader.getUnprocessedItems(1);

  if (items.length === 0) {
    console.log("No unprocessed items found");
    process.exit(0);
  }

  const item = items[0];
  console.log("─".repeat(60));
  console.log(`📝 Evaluating: ${item.title}`);
  console.log(`   Source: ${item.source}`);
  console.log(`   URL: ${item.url}`);
  console.log("─".repeat(60));

  try {
    // Run full Gate 1 evaluation
    const result = await gate1.evaluate({
      feedItemId: item.id,
      title: item.title,
      summary: item.summary || "",
      sourceUrl: item.url,
      sourceName: item.source,
      category: item.category,
      publishedDate: item.publishedDate ? new Date(item.publishedDate) : undefined,
    });

    console.log("\n📊 GATE 1 RESULTS:");
    console.log("─".repeat(60));
    console.log(`   Decision: ${result.decision.toUpperCase()}`);
    console.log(`   Tier: ${result.tier}`);
    console.log(`   Total Score: ${result.totalScore}/100`);
    console.log(`   SEO Score: ${result.seoAnalysis.score}/100`);
    console.log(`   AEO Score: ${result.aeoAnalysis.score}/100`);
    console.log(`   Virality Score: ${result.viralityAnalysis.score}/100`);
    console.log(`   Writer: ${result.writerName} (${result.recommendedWriterId})`);
    console.log(`   Value Matrix: ${result.valueMatrixQuadrant}`);
    console.log(`   Processing Time: ${result.processingTimeMs}ms`);
    console.log("\n📝 Reasoning:");
    console.log(`   ${result.reasoning}`);

    if (result.seoAnalysis.keywordOpportunities?.length > 0) {
      console.log("\n🔑 Keywords:");
      console.log(`   ${result.seoAnalysis.keywordOpportunities.join(", ")}`);
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
  }

  console.log("\n✅ Test complete!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
