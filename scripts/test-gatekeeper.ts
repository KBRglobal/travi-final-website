/**
 * Test script for Gatekeeper Pipeline
 * Run with: DATABASE_URL=... npx tsx scripts/test-gatekeeper.ts
 */

import { rssReader } from "../server/octypo/rss-reader";
import { getGate1Selector } from "../server/octypo/gatekeeper/gate1-selector";
import { getDeduplicationEngine } from "../server/octypo/gatekeeper/deduplication";

async function main() {
  console.log("🚀 Starting Gatekeeper Test Run...\n");

  // Initialize
  await rssReader.initialize();
  getGate1Selector();
  const dedupEngine = getDeduplicationEngine();

  // Get 5 unprocessed items
  const items = await rssReader.getUnprocessedItems(5);
  console.log(`📰 Found ${items.length} unprocessed items\n`);

  for (const item of items) {
    console.log("─".repeat(60));
    console.log(`📝 Title: ${item.title.substring(0, 60)}...`);
    console.log(`   Source: ${item.source}`);
    console.log(`   Category: ${item.category}`);

    // Step 1: Deduplication check
    const dedupResult = await dedupEngine.checkContent(item.title, item.summary || "", item.url);

    if (dedupResult.isOriginal === false) {
      console.log(
        `   ❌ DUPLICATE (${Math.round((dedupResult.duplicateOf?.similarity || 0) * 100)}% similar)`
      );
      console.log(`      Similar to: ${dedupResult.duplicateOf?.sourceTitle?.substring(0, 50)}`);
      continue;
    }

    console.log(`   ✅ Original content (dedup check: ${dedupResult.processingTimeMs}ms)`);
    console.log(`   📊 Ready for Gate 1 LLM evaluation`);
  }

  console.log("\n" + "─".repeat(60));
  console.log("✅ Test run complete!");

  // Show dedup stats
  const stats = await dedupEngine.getStats();
  console.log(`\n📈 Dedup Stats: ${stats.totalFingerprints} fingerprints stored`);

  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
