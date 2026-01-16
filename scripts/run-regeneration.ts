import { regenerateAllAttractions, getRegenerationStats } from '../server/services/content-regeneration-job';

async function main() {
  console.log("Starting content regeneration for all attractions...");
  console.log("This will take several hours. Progress will be logged.");
  console.log("");
  
  try {
    await regenerateAllAttractions({
      batchSize: 10,
      delayBetweenBatches: 30000, // 30 seconds between batches
      onlyFailed: false,
    });
    
    console.log("\n✅ Regeneration complete!");
    console.log("Final stats:", getRegenerationStats());
  } catch (error) {
    console.error("\n❌ Regeneration failed:", error);
    process.exit(1);
  }
}

main();
