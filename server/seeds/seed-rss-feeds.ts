/**
 * RSS Feeds Seed Data
 * 51 curated travel RSS feeds organized by destination
 */

import { db } from "../db";
import { rssFeeds, destinations } from "@shared/schema";
import { eq } from "drizzle-orm";

interface RssFeedSeed {
  name: string;
  url: string;
  category:
    | "travel_tips"
    | "destination_news"
    | "food_culture"
    | "hotels_resorts"
    | "events_festivals";
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
    category: "hotels_resorts",
    destinationSlug: null,
    language: "en",
    region: "global",
  },
  {
    name: "Skift - Travel Trends",
    url: "https://skift.com/feed",
    category: "travel_tips",
    destinationSlug: null,
    language: "en",
    region: "global",
  },
  {
    name: "Breaking Travel News - Hotels",
    url: "https://feeds.feedburner.com/breakingtravelnews/news/hotel",
    category: "hotels_resorts",
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
    category: "events_festivals",
    destinationSlug: "dubai",
    language: "en",
    region: "middle-east",
  },
  {
    name: "Dubai City Guide Blog",
    url: "https://blog.dubaicityguide.com/site/feed",
    category: "destination_news",
    destinationSlug: "dubai",
    language: "en",
    region: "middle-east",
  },
  {
    name: "Dubai.com Blog",
    url: "https://www.dubai.com/blog/feed",
    category: "travel_tips",
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
    category: "travel_tips",
    destinationSlug: "abu-dhabi",
    language: "en",
    region: "middle-east",
  },
  {
    name: "Abu Dhabi City Guide",
    url: "https://blog.abudhabicityguide.com/feed",
    category: "destination_news",
    destinationSlug: "abu-dhabi",
    language: "en",
    region: "middle-east",
  },
  {
    name: "Arabian Notes",
    url: "https://arabiannotes.com/feed",
    category: "food_culture",
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
    category: "destination_news",
    destinationSlug: "ras-al-khaimah",
    language: "en",
    region: "middle-east",
  },
  {
    name: "Hotelier Middle East",
    url: "https://www.hoteliermiddleeast.com/rss",
    category: "hotels_resorts",
    destinationSlug: "ras-al-khaimah",
    language: "en",
    region: "middle-east",
  },
  {
    name: "TravelMole Middle East",
    url: "https://www.travelmole.com/rss",
    category: "travel_tips",
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
    category: "events_festivals",
    destinationSlug: "london",
    language: "en",
    region: "europe",
  },
  {
    name: "A Lady in London",
    url: "https://www.aladyinlondon.com/feed",
    category: "travel_tips",
    destinationSlug: "london",
    language: "en",
    region: "europe",
  },
  {
    name: "Sunny in London",
    url: "https://sunnyinlondon.com/feed",
    category: "destination_news",
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
    category: "travel_tips",
    destinationSlug: "paris",
    language: "en",
    region: "europe",
  },
  {
    name: "Secrets of Paris",
    url: "https://www.secretsofparis.com/feed",
    category: "destination_news",
    destinationSlug: "paris",
    language: "en",
    region: "europe",
  },
  {
    name: "HiP Paris",
    url: "https://hipparis.com/feed",
    category: "food_culture",
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
    category: "destination_news",
    destinationSlug: "barcelona",
    language: "en",
    region: "europe",
  },
  {
    name: "Barcelona Navigator",
    url: "https://www.barcelonanavigator.com/feed",
    category: "travel_tips",
    destinationSlug: "barcelona",
    language: "en",
    region: "europe",
  },
  {
    name: "Spain by Hanne",
    url: "https://spainbyhanne.dk/feed",
    category: "food_culture",
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
    category: "destination_news",
    destinationSlug: "rome",
    language: "en",
    region: "europe",
  },
  {
    name: "Mama Loves Rome",
    url: "https://mamalovesrome.com/feed",
    category: "travel_tips",
    destinationSlug: "rome",
    language: "en",
    region: "europe",
  },
  {
    name: "Roman Vacations",
    url: "https://www.roman-vacations.com/feed",
    category: "food_culture",
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
    category: "destination_news",
    destinationSlug: "amsterdam",
    language: "en",
    region: "europe",
  },
  {
    name: "Amsterdam Foodie",
    url: "https://www.amsterdamfoodie.nl/feed",
    category: "food_culture",
    destinationSlug: "amsterdam",
    language: "en",
    region: "europe",
  },
  {
    name: "Amsterdamian",
    url: "https://amsterdamian.com/feed",
    category: "travel_tips",
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
    category: "travel_tips",
    destinationSlug: "tokyo",
    language: "en",
    region: "asia",
  },
  {
    name: "Time Out Tokyo",
    url: "https://www.timeout.com/tokyo/blog/feed",
    category: "events_festivals",
    destinationSlug: "tokyo",
    language: "en",
    region: "asia",
  },
  {
    name: "Nippon.com Travel",
    url: "https://www.nippon.com/en/rss_list/",
    category: "food_culture",
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
    category: "travel_tips",
    destinationSlug: "singapore",
    language: "en",
    region: "asia",
  },
  {
    name: "The Occasional Traveller",
    url: "https://theoccasionaltraveller.com/feed",
    category: "destination_news",
    destinationSlug: "singapore",
    language: "en",
    region: "asia",
  },
  {
    name: "Alvinology Singapore",
    url: "https://alvinology.com/feed",
    category: "food_culture",
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
    category: "destination_news",
    destinationSlug: "bangkok",
    language: "en",
    region: "asia",
  },
  {
    name: "Bangkok Post Life",
    url: "https://www.bangkokpost.com/rss/data/life.xml",
    category: "food_culture",
    destinationSlug: "bangkok",
    language: "en",
    region: "asia",
  },
  {
    name: "Thaizer Blog",
    url: "https://www.thaizer.com/feed",
    category: "travel_tips",
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
    category: "events_festivals",
    destinationSlug: "hong-kong",
    language: "en",
    region: "asia",
  },
  {
    name: "Hello Hong Kong",
    url: "https://www.hellohongkong.com.hk/blog/feed",
    category: "destination_news",
    destinationSlug: "hong-kong",
    language: "en",
    region: "asia",
  },
  {
    name: "The HK Hub Travel",
    url: "https://thehkhub.com/hub/travel/feed",
    category: "travel_tips",
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
    category: "events_festivals",
    destinationSlug: "new-york",
    language: "en",
    region: "north-america",
  },
  {
    name: "I Love NY Blog",
    url: "https://www.iloveny.com/blog/feed",
    category: "destination_news",
    destinationSlug: "new-york",
    language: "en",
    region: "north-america",
  },
  {
    name: "City Guide NY",
    url: "https://www.cityguideny.com/articles/tourism-news",
    category: "travel_tips",
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
    category: "events_festivals",
    destinationSlug: "las-vegas",
    language: "en",
    region: "north-america",
  },
  {
    name: "VegasNews.com",
    url: "https://www.vegasnews.com/feed",
    category: "destination_news",
    destinationSlug: "las-vegas",
    language: "en",
    region: "north-america",
  },
  {
    name: "Las Vegas Advisor",
    url: "https://www.lasvegasadvisor.com/feed",
    category: "travel_tips",
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
    category: "food_culture",
    destinationSlug: "los-angeles",
    language: "en",
    region: "north-america",
  },
  {
    name: "We Like LA",
    url: "https://www.welikela.com/feed",
    category: "events_festivals",
    destinationSlug: "los-angeles",
    language: "en",
    region: "north-america",
  },
  {
    name: "Time Out LA",
    url: "https://www.timeout.com/los-angeles/blog/feed",
    category: "destination_news",
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
    category: "food_culture",
    destinationSlug: "miami",
    language: "en",
    region: "north-america",
  },
  {
    name: "Miami Art Scene",
    url: "https://www.themiamiartscene.com/feed",
    category: "events_festivals",
    destinationSlug: "miami",
    language: "en",
    region: "north-america",
  },
  {
    name: "Miami Luxury Homes",
    url: "https://miamiluxuryhomes.com/feed",
    category: "hotels_resorts",
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
    category: "travel_tips",
    destinationSlug: "istanbul",
    language: "en",
    region: "europe",
  },
  {
    name: "Istanbul Clues",
    url: "https://istanbulclues.com/feed",
    category: "destination_news",
    destinationSlug: "istanbul",
    language: "en",
    region: "europe",
  },
  {
    name: "Turkey's For Life",
    url: "https://www.turkeysforlife.com/feed",
    category: "food_culture",
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
  } = {}
): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const { dryRun = false, skipExisting = true } = options;
  const results = { created: 0, skipped: 0, errors: [] as string[] };

  console.log(`\n📡 Seeding RSS Feeds (${RSS_FEEDS.length} total)...`);
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`   Skip existing: ${skipExisting}\n`);

  // Get all destinations for mapping
  const allDestinations = await db.select().from(destinations);
  const destinationMap = new Map(allDestinations.map(d => [d.slug, d.id]));

  for (const feed of RSS_FEEDS) {
    try {
      // Check if feed already exists
      const existing = await db.select().from(rssFeeds).where(eq(rssFeeds.url, feed.url)).limit(1);

      if (existing.length > 0) {
        if (skipExisting) {
          console.log(`   ⏭️  Skipping existing: ${feed.name}`);
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
        });
      }

      console.log(`   ✅ ${dryRun ? "[DRY] " : ""}Created: ${feed.name}`);
      results.created++;
    } catch (error) {
      const errorMsg = `Failed to create ${feed.name}: ${error}`;
      console.error(`   ❌ ${errorMsg}`);
      results.errors.push(errorMsg);
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Created: ${results.created}`);
  console.log(`   Skipped: ${results.skipped}`);
  console.log(`   Errors: ${results.errors.length}`);

  return results;
}

// =============================================================================
// CLI RUNNER
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  seedRssFeeds({ dryRun, skipExisting: !force })
    .then(results => {
      console.log("\n✨ Done!");
      process.exit(results.errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    });
}

// Export the feed list for reference
export { RSS_FEEDS };
