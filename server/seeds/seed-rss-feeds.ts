/**
 * RSS Feeds Seed Data
 * 51 curated travel RSS feeds organized by destination
 */

import { db } from "../db";
import { rssFeeds, destinations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { fileURLToPath } from "node:url";

interface RssFeedSeed {
  name: string;
  url: string;
  category:
    | "attractions"
    | "hotels"
    | "food"
    | "transport"
    | "events"
    | "tips"
    | "news"
    | "shopping";
  destinationSlug: string | null; // null for global feeds
  language: string;
  region: string;
}

const RSS_FEEDS: RssFeedSeed[] = [
  // =============================================================================
  // 1. GLOBAL SOURCES (לכיסוי רוחבי של כל היעדים)
  // =============================================================================
  {
    name: "Hospitality Net - Global Hotel News",
    url: "https://hospitalitynet.org/news/global.xml",
    category: "hotels",
    destinationSlug: null,
    language: "en",
    region: "global",
  },
  {
    name: "Skift - Travel Trends",
    url: "https://skift.com/feed",
    category: "tips",
    destinationSlug: null,
    language: "en",
    region: "global",
  },
  {
    name: "Breaking Travel News - Hotels",
    url: "https://feeds.feedburner.com/breakingtravelnews/news/hotel",
    category: "hotels",
    destinationSlug: null,
    language: "en",
    region: "global",
  },

  // =============================================================================
  // 2. UAE - DUBAI
  // =============================================================================
  {
    name: "What's On Dubai",
    url: "https://whatson.ae/feed",
    category: "events",
    destinationSlug: "dubai",
    language: "en",
    region: "middle-east",
  },
  {
    name: "Dubai City Guide Blog",
    url: "https://blog.dubaicityguide.com/site/feed",
    category: "news",
    destinationSlug: "dubai",
    language: "en",
    region: "middle-east",
  },
  {
    name: "Dubai.com Blog",
    url: "https://www.dubai.com/blog/feed",
    category: "tips",
    destinationSlug: "dubai",
    language: "en",
    region: "middle-east",
  },

  // =============================================================================
  // 2. UAE - ABU DHABI
  // =============================================================================
  {
    name: "Abu Dhabi Travel Blog",
    url: "https://www.abudhabi.com/blog/feed",
    category: "tips",
    destinationSlug: "abu-dhabi",
    language: "en",
    region: "middle-east",
  },
  {
    name: "Abu Dhabi City Guide",
    url: "https://blog.abudhabicityguide.com/feed",
    category: "news",
    destinationSlug: "abu-dhabi",
    language: "en",
    region: "middle-east",
  },
  {
    name: "Arabian Notes",
    url: "https://arabiannotes.com/feed",
    category: "food",
    destinationSlug: "abu-dhabi",
    language: "en",
    region: "middle-east",
  },

  // =============================================================================
  // 2. UAE - RAS AL KHAIMAH
  // =============================================================================
  {
    name: "RAKTDA Official Blog",
    url: "https://raktda.com/blog/feed",
    category: "news",
    destinationSlug: "ras-al-khaimah",
    language: "en",
    region: "middle-east",
  },
  {
    name: "Hotelier Middle East",
    url: "https://www.hoteliermiddleeast.com/rss",
    category: "hotels",
    destinationSlug: "ras-al-khaimah",
    language: "en",
    region: "middle-east",
  },
  {
    name: "TravelMole Middle East",
    url: "https://www.travelmole.com/rss",
    category: "tips",
    destinationSlug: "ras-al-khaimah",
    language: "en",
    region: "middle-east",
  },

  // =============================================================================
  // 3. EUROPE - LONDON
  // =============================================================================
  {
    name: "Time Out London",
    url: "https://www.timeout.com/london/blog/feed",
    category: "events",
    destinationSlug: "london",
    language: "en",
    region: "europe",
  },
  {
    name: "A Lady in London",
    url: "https://www.aladyinlondon.com/feed",
    category: "tips",
    destinationSlug: "london",
    language: "en",
    region: "europe",
  },
  {
    name: "Sunny in London",
    url: "https://sunnyinlondon.com/feed",
    category: "news",
    destinationSlug: "london",
    language: "en",
    region: "europe",
  },

  // =============================================================================
  // 3. EUROPE - PARIS
  // =============================================================================
  {
    name: "Paris Perfect Blog",
    url: "https://www.parisperfect.com/blog/feed",
    category: "tips",
    destinationSlug: "paris",
    language: "en",
    region: "europe",
  },
  {
    name: "Secrets of Paris",
    url: "https://www.secretsofparis.com/feed",
    category: "news",
    destinationSlug: "paris",
    language: "en",
    region: "europe",
  },
  {
    name: "HiP Paris",
    url: "https://hipparis.com/feed",
    category: "food",
    destinationSlug: "paris",
    language: "en",
    region: "europe",
  },

  // =============================================================================
  // 3. EUROPE - BARCELONA
  // =============================================================================
  {
    name: "Barcelona Life",
    url: "https://www.barcelona-life.com/feed",
    category: "news",
    destinationSlug: "barcelona",
    language: "en",
    region: "europe",
  },
  {
    name: "Barcelona Navigator",
    url: "https://www.barcelonanavigator.com/feed",
    category: "tips",
    destinationSlug: "barcelona",
    language: "en",
    region: "europe",
  },
  {
    name: "Spain by Hanne",
    url: "https://spainbyhanne.dk/feed",
    category: "food",
    destinationSlug: "barcelona",
    language: "en",
    region: "europe",
  },

  // =============================================================================
  // 3. EUROPE - ROME
  // =============================================================================
  {
    name: "Romeing",
    url: "https://www.romeing.it/feed",
    category: "news",
    destinationSlug: "rome",
    language: "en",
    region: "europe",
  },
  {
    name: "Mama Loves Rome",
    url: "https://mamalovesrome.com/feed",
    category: "tips",
    destinationSlug: "rome",
    language: "en",
    region: "europe",
  },
  {
    name: "Roman Vacations",
    url: "https://www.roman-vacations.com/feed",
    category: "food",
    destinationSlug: "rome",
    language: "en",
    region: "europe",
  },

  // =============================================================================
  // 3. EUROPE - AMSTERDAM
  // =============================================================================
  {
    name: "Your Little Black Book Amsterdam",
    url: "https://www.yourlittleblackbook.me/feed",
    category: "news",
    destinationSlug: "amsterdam",
    language: "en",
    region: "europe",
  },
  {
    name: "Amsterdam Foodie",
    url: "https://www.amsterdamfoodie.nl/feed",
    category: "food",
    destinationSlug: "amsterdam",
    language: "en",
    region: "europe",
  },
  {
    name: "Amsterdamian",
    url: "https://amsterdamian.com/feed",
    category: "tips",
    destinationSlug: "amsterdam",
    language: "en",
    region: "europe",
  },

  // =============================================================================
  // 4. ASIA - TOKYO
  // =============================================================================
  {
    name: "Tokyo Cheapo",
    url: "https://tokyocheapo.com/feed",
    category: "tips",
    destinationSlug: "tokyo",
    language: "en",
    region: "asia",
  },
  {
    name: "Time Out Tokyo",
    url: "https://www.timeout.com/tokyo/blog/feed",
    category: "events",
    destinationSlug: "tokyo",
    language: "en",
    region: "asia",
  },
  {
    name: "Nippon.com Travel",
    url: "https://www.nippon.com/en/rss_list/",
    category: "food",
    destinationSlug: "tokyo",
    language: "en",
    region: "asia",
  },

  // =============================================================================
  // 4. ASIA - SINGAPORE
  // =============================================================================
  {
    name: "I Wandered Singapore",
    url: "https://iwandered.net/feed",
    category: "tips",
    destinationSlug: "singapore",
    language: "en",
    region: "asia",
  },
  {
    name: "The Occasional Traveller",
    url: "https://theoccasionaltraveller.com/feed",
    category: "news",
    destinationSlug: "singapore",
    language: "en",
    region: "asia",
  },
  {
    name: "Alvinology Singapore",
    url: "https://alvinology.com/feed",
    category: "food",
    destinationSlug: "singapore",
    language: "en",
    region: "asia",
  },

  // =============================================================================
  // 4. ASIA - BANGKOK
  // =============================================================================
  {
    name: "TAT Newsroom Thailand",
    url: "https://www.tatnews.org/feed",
    category: "news",
    destinationSlug: "bangkok",
    language: "en",
    region: "asia",
  },
  {
    name: "Bangkok Post Life",
    url: "https://www.bangkokpost.com/rss/data/life.xml",
    category: "food",
    destinationSlug: "bangkok",
    language: "en",
    region: "asia",
  },
  {
    name: "Thaizer Blog",
    url: "https://www.thaizer.com/feed",
    category: "tips",
    destinationSlug: "bangkok",
    language: "en",
    region: "asia",
  },

  // =============================================================================
  // 4. ASIA - HONG KONG
  // =============================================================================
  {
    name: "Sassy Hong Kong",
    url: "https://www.sassyhongkong.com/feed",
    category: "events",
    destinationSlug: "hong-kong",
    language: "en",
    region: "asia",
  },
  {
    name: "Hello Hong Kong",
    url: "https://www.hellohongkong.com.hk/blog/feed",
    category: "news",
    destinationSlug: "hong-kong",
    language: "en",
    region: "asia",
  },
  {
    name: "The HK Hub Travel",
    url: "https://thehkhub.com/hub/travel/feed",
    category: "tips",
    destinationSlug: "hong-kong",
    language: "en",
    region: "asia",
  },

  // =============================================================================
  // 5. USA - NEW YORK
  // =============================================================================
  {
    name: "Time Out New York",
    url: "https://www.timeout.com/newyork/blog/feed",
    category: "events",
    destinationSlug: "new-york",
    language: "en",
    region: "north-america",
  },
  {
    name: "I Love NY Blog",
    url: "https://www.iloveny.com/blog/feed",
    category: "news",
    destinationSlug: "new-york",
    language: "en",
    region: "north-america",
  },
  {
    name: "City Guide NY",
    url: "https://www.cityguideny.com/articles/tourism-news",
    category: "tips",
    destinationSlug: "new-york",
    language: "en",
    region: "north-america",
  },

  // =============================================================================
  // 5. USA - LAS VEGAS
  // =============================================================================
  {
    name: "Las Vegas Weekly",
    url: "https://lasvegasweekly.com/feeds/headlines",
    category: "events",
    destinationSlug: "las-vegas",
    language: "en",
    region: "north-america",
  },
  {
    name: "VegasNews.com",
    url: "https://www.vegasnews.com/feed",
    category: "news",
    destinationSlug: "las-vegas",
    language: "en",
    region: "north-america",
  },
  {
    name: "Las Vegas Advisor",
    url: "https://www.lasvegasadvisor.com/feed",
    category: "tips",
    destinationSlug: "las-vegas",
    language: "en",
    region: "north-america",
  },

  // =============================================================================
  // 5. USA - LOS ANGELES
  // =============================================================================
  {
    name: "Eater LA",
    url: "https://la.eater.com/rss/index.xml",
    category: "food",
    destinationSlug: "los-angeles",
    language: "en",
    region: "north-america",
  },
  {
    name: "We Like LA",
    url: "https://www.welikela.com/feed",
    category: "events",
    destinationSlug: "los-angeles",
    language: "en",
    region: "north-america",
  },
  {
    name: "Time Out LA",
    url: "https://www.timeout.com/los-angeles/blog/feed",
    category: "news",
    destinationSlug: "los-angeles",
    language: "en",
    region: "north-america",
  },

  // =============================================================================
  // 5. USA - MIAMI
  // =============================================================================
  {
    name: "Eater Miami",
    url: "https://miami.eater.com/rss/index.xml",
    category: "food",
    destinationSlug: "miami",
    language: "en",
    region: "north-america",
  },
  {
    name: "Miami Art Scene",
    url: "https://www.themiamiartscene.com/feed",
    category: "events",
    destinationSlug: "miami",
    language: "en",
    region: "north-america",
  },
  {
    name: "Miami Luxury Homes",
    url: "https://miamiluxuryhomes.com/feed",
    category: "hotels",
    destinationSlug: "miami",
    language: "en",
    region: "north-america",
  },

  // =============================================================================
  // 6. TURKEY - ISTANBUL
  // =============================================================================
  {
    name: "Inside Out In Istanbul",
    url: "https://www.insideoutinistanbul.com/feed",
    category: "tips",
    destinationSlug: "istanbul",
    language: "en",
    region: "europe",
  },
  {
    name: "Istanbul Clues",
    url: "https://istanbulclues.com/feed",
    category: "news",
    destinationSlug: "istanbul",
    language: "en",
    region: "europe",
  },
  {
    name: "Turkey's For Life",
    url: "https://www.turkeysforlife.com/feed",
    category: "food",
    destinationSlug: "istanbul",
    language: "en",
    region: "europe",
  },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

export async function seedRssFeeds(
  options: {
    dryRun?: boolean;
    skipExisting?: boolean;
    clean?: boolean;
  } = {}
): Promise<{
  created: number;
  skipped: number;
  deleted: number;
  errors: string[];
}> {
  const { dryRun = false, skipExisting = true, clean = false } = options;
  const results = { created: 0, skipped: 0, deleted: 0, errors: [] as string[] };

  console.info(`\n📡 Seeding RSS Feeds (${RSS_FEEDS.length} total)...`);
  console.info(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.info(`   Clean existing: ${clean}`);
  console.info(`   Skip existing: ${skipExisting}\n`);

  // Clean existing feeds if requested
  if (clean) {
    console.info("🗑️  Deleting all existing RSS feeds...");
    if (!dryRun) {
      const deleted = await db.delete(rssFeeds);
      results.deleted = deleted.rowCount || 0;
    }
    console.info(`   ✅ ${dryRun ? "[DRY] Would delete" : "Deleted"} all existing feeds\n`);
  }

  // Get all destinations for mapping
  const allDestinations = await db.select().from(destinations);
  const destinationMap = new Map(allDestinations.map(d => [d.slug, String(d.id)]));

  for (const feed of RSS_FEEDS) {
    try {
      // Check if feed already exists
      const existing = await db.select().from(rssFeeds).where(eq(rssFeeds.url, feed.url)).limit(1);

      if (existing.length > 0) {
        if (skipExisting) {
          console.info(`   ⏭️  Skipping existing: ${feed.name}`);
          results.skipped++;
          continue;
        }
      }

      // Get destination ID
      let destinationId: string | null = null;
      if (feed.destinationSlug) {
        destinationId = destinationMap.get(feed.destinationSlug) || null;
        if (!destinationId) {
          console.warn(`   ⚠️  Destination not found: ${feed.destinationSlug}`);
        }
      }

      if (!dryRun) {
        await db.insert(rssFeeds).values({
          name: feed.name,
          url: feed.url,
          category: feed.category,
          destinationId,
          language: feed.language,
          region: feed.region,
          isActive: true,
          fetchIntervalMinutes: 60,
        } as any);
      }

      console.info(`   ✅ ${dryRun ? "[DRY] " : ""}Created: ${feed.name}`);
      results.created++;
    } catch (error) {
      const errorMsg = `Failed to create ${feed.name}: ${error}`;
      console.error(`   ❌ ${errorMsg}`);
      results.errors.push(errorMsg);
    }
  }

  console.info(`\n📊 Results:`);
  if (results.deleted > 0) {
    console.info(`   Deleted: ${results.deleted}`);
  }
  console.info(`   Created: ${results.created}`);
  console.info(`   Skipped: ${results.skipped}`);
  console.info(`   Errors: ${results.errors.length}`);

  return results;
}

// =============================================================================
// CLI RUNNER (ESM compatible)
// =============================================================================

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const force = args.has("--force");
  const clean = args.has("--clean");

  if (args.has("--help") || args.has("-h")) {
    console.info(`
Usage: npx tsx server/seeds/seed-rss-feeds.ts [options]

Options:
  --dry-run   Show what would be done without making changes
  --clean     Delete ALL existing feeds before seeding
  --force     Overwrite existing feeds (don't skip)
  --help, -h  Show this help message

Examples:
  npx tsx server/seeds/seed-rss-feeds.ts --clean          # Delete old + add 51 new
  npx tsx server/seeds/seed-rss-feeds.ts --clean --dry-run # Preview what would happen
`);
    process.exit(0);
  }

  try {
    const results = await seedRssFeeds({ dryRun, skipExisting: !force, clean });
    console.info("\n✨ Done!");
    process.exit(results.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

// Export the feed list for reference
export { RSS_FEEDS };
