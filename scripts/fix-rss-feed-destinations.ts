/**
 * Script to update RSS feeds with correct destination_id
 */
import { pool } from "../server/db";

// Feed name patterns -> destination slugs
const FEED_DESTINATION_MAP: Record<string, string> = {
  // Dubai
  whatson: "dubai",
  "dubai city guide": "dubai",
  "dubai.com": "dubai",

  // Abu Dhabi
  "abu dhabi": "abu-dhabi",
  abudhabicityguide: "abu-dhabi",

  // Ras Al Khaimah
  raktda: "ras-al-khaimah",
  arabiannotes: "ras-al-khaimah",

  // UAE General
  "travelmole me": "dubai", // Default UAE to Dubai
  "hotelier middle east": "dubai",

  // London
  london: "london",
  "sunny in london": "london",
  "lady in london": "london",
  "time out london": "london",

  // Paris
  paris: "paris",
  "hip paris": "paris",
  "secrets of paris": "paris",
  "paris perfect": "paris",

  // Barcelona
  barcelona: "barcelona",
  "spain by hanne": "barcelona",

  // Rome
  roman: "rome",
  rome: "rome",
  "mama loves rome": "rome",
  romeing: "rome",

  // Amsterdam
  amsterdam: "amsterdam",
  "little black book": "amsterdam",

  // Tokyo
  tokyo: "tokyo",
  nippon: "tokyo",
  "time out tokyo": "tokyo",

  // Singapore
  singapore: "singapore",
  alvinology: "singapore",
  "occasional traveller": "singapore",
  iwandered: "singapore",

  // Bangkok
  bangkok: "bangkok",
  thaizer: "bangkok",
  "tat newsroom": "bangkok",

  // Hong Kong
  "hong kong": "hong-kong",
  "hk hub": "hong-kong",
  "sassy hong kong": "hong-kong",

  // New York
  "new york": "new-york",
  "city guide ny": "new-york",
  "i love ny": "new-york",
  "time out new york": "new-york",

  // Las Vegas
  "las vegas": "las-vegas",
  vegas: "las-vegas",

  // Los Angeles
  "los angeles": "los-angeles",
  "time out la": "los-angeles",
  welikela: "los-angeles",
  "eater la": "los-angeles",

  // Miami
  miami: "miami",
  "eater miami": "miami",

  // Istanbul
  istanbul: "istanbul",
  "turkeys for life": "istanbul",
  "inside out in istanbul": "istanbul",
};

function findDestinationForFeed(feedName: string): string | null {
  const lowerName = feedName.toLowerCase();

  // Exact and partial matches
  for (const [pattern, destSlug] of Object.entries(FEED_DESTINATION_MAP)) {
    if (lowerName.includes(pattern.toLowerCase())) {
      return destSlug;
    }
  }

  return null;
}

async function updateFeedDestinations() {
  try {
    console.log("Fetching all RSS feeds...");

    // Get all feeds
    const feeds = await pool.query(`
      SELECT id, name, destination_id FROM rss_feeds
    `);

    console.log(`Found ${feeds.rows.length} feeds`);

    let updated = 0;
    let skipped = 0;

    for (const feed of feeds.rows) {
      if (feed.destination_id) {
        console.log(`  ✓ ${feed.name} - already has destination`);
        skipped++;
        continue;
      }

      const destSlug = findDestinationForFeed(feed.name);

      if (destSlug) {
        // Update the feed
        await pool.query(`UPDATE rss_feeds SET destination_id = $1 WHERE id = $2`, [
          destSlug,
          feed.id,
        ]);
        console.log(`  ✓ ${feed.name} → ${destSlug}`);
        updated++;
      } else {
        console.log(`  ? ${feed.name} - no match found`);
      }
    }

    console.log(`\n✅ Done! Updated: ${updated}, Skipped: ${skipped}`);

    // Show summary by destination
    const summary = await pool.query(`
      SELECT destination_id, COUNT(*) as count
      FROM rss_feeds
      WHERE destination_id IS NOT NULL
      GROUP BY destination_id
      ORDER BY count DESC
    `);

    console.log("\nFeeds by destination:");
    for (const row of summary.rows) {
      console.log(`  ${row.destination_id}: ${row.count} feeds`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    await pool.end();
    process.exit(1);
  }
}

await updateFeedDestinations();
