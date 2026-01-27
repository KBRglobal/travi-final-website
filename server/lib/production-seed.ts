import { db } from "../db.js";
import {
  update9987Guides,
  update9987Countries,
  update9987States,
  update9987PublicHolidays,
  update9987TourpediaPois,
  tiqetsAttractions,
  visaRequirements,
  destinationEvents,
} from "@shared/schema.js";
import { count } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { gunzipSync } from "zlib";

const SEED_DATA_DIR = join(process.cwd(), "server", "data", "seed");

async function loadTable(tableName: string): Promise<any[]> {
  const gzPath = join(SEED_DATA_DIR, `${tableName}.json.gz`);
  try {
    if (!existsSync(gzPath)) {
      return [];
    }
    const compressed = readFileSync(gzPath);
    const content = gunzipSync(compressed).toString("utf-8");
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

async function seedTable(
  tableName: string,
  table: any,
  data: any[],
  batchSize = 100
): Promise<number> {
  if (data.length === 0) return 0;

  let inserted = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      await db.insert(table).values(batch).onConflictDoNothing();
      inserted += batch.length;
      if (i % 1000 === 0 && i > 0) {
      }
    } catch (e: any) {}
  }

  return inserted;
}

export async function runProductionSeed(): Promise<void> {
  if (process.env.RUN_PROD_SEED !== "true") {
    return;
  }

  try {
    const manifestPath = join(SEED_DATA_DIR, "manifest.json");
    if (!existsSync(manifestPath)) {
      return;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    const existingGuides = await db.select({ count: count() }).from(update9987Guides);
    const existingAttractions = await db.select({ count: count() }).from(tiqetsAttractions);
    const existingVisas = await db.select({ count: count() }).from(visaRequirements);

    const guides = await loadTable("update_9987_guides");
    await seedTable("update_9987_guides", update9987Guides, guides);

    const countries = await loadTable("update_9987_countries");
    await seedTable("update_9987_countries", update9987Countries, countries);

    const states = await loadTable("update_9987_states");
    await seedTable("update_9987_states", update9987States, states);

    const holidays = await loadTable("update_9987_public_holidays");
    await seedTable("update_9987_public_holidays", update9987PublicHolidays, holidays);

    const attractions = await loadTable("tiqets_attractions");
    await seedTable("tiqets_attractions", tiqetsAttractions, attractions);

    const visas = await loadTable("visa_requirements");
    await seedTable("visa_requirements", visaRequirements, visas);

    const events = await loadTable("destination_events");
    await seedTable("destination_events", destinationEvents, events);

    const pois = await loadTable("update_9987_tourpedia_pois");
    await seedTable("update_9987_tourpedia_pois", update9987TourpediaPois, pois, 500);
  } catch (error) {}
}
