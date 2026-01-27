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
import { Client } from "@replit/object-storage";
import { sql } from "drizzle-orm";

const client = new Client();
const EXPORT_PREFIX = "db-exports";

async function loadTable(tableName: string): Promise<any[]> {
  const key = `${EXPORT_PREFIX}/${tableName}.json`;
  try {
    const result = await client.downloadAsText(key);
    if (result.ok) {
      return JSON.parse(result.value);
    } else {
      return [];
    }
  } catch (e) {
    return [];
  }
}

async function seedTable(tableName: string, table: any, data: any[], batchSize = 100) {
  if (data.length === 0) {
    return 0;
  }

  let inserted = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      await db.insert(table).values(batch).onConflictDoNothing();
      inserted += batch.length;
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= data.length) {
      }
    } catch (e: any) {}
  }

  return inserted;
}

async function main() {
  const manifestResult = await client.downloadAsText(`${EXPORT_PREFIX}/manifest.json`);
  if (!manifestResult.ok) {
    process.exit(1);
  }

  const manifest = JSON.parse(manifestResult.value);

  const results: { table: string; inserted: number }[] = [];

  const guides = await loadTable("update_9987_guides");
  results.push({
    table: "update_9987_guides",
    inserted: await seedTable("update_9987_guides", update9987Guides, guides),
  });

  const countries = await loadTable("update_9987_countries");
  results.push({
    table: "update_9987_countries",
    inserted: await seedTable("update_9987_countries", update9987Countries, countries),
  });

  const states = await loadTable("update_9987_states");
  results.push({
    table: "update_9987_states",
    inserted: await seedTable("update_9987_states", update9987States, states),
  });

  const holidays = await loadTable("update_9987_public_holidays");
  results.push({
    table: "update_9987_public_holidays",
    inserted: await seedTable("update_9987_public_holidays", update9987PublicHolidays, holidays),
  });

  const attractions = await loadTable("tiqets_attractions");
  results.push({
    table: "tiqets_attractions",
    inserted: await seedTable("tiqets_attractions", tiqetsAttractions, attractions),
  });

  const visas = await loadTable("visa_requirements");
  results.push({
    table: "visa_requirements",
    inserted: await seedTable("visa_requirements", visaRequirements, visas),
  });

  const events = await loadTable("destination_events");
  results.push({
    table: "destination_events",
    inserted: await seedTable("destination_events", destinationEvents, events),
  });

  const pois = await loadTable("update_9987_tourpedia_pois");
  results.push({
    table: "update_9987_tourpedia_pois",
    inserted: await seedTable("update_9987_tourpedia_pois", update9987TourpediaPois, pois, 500),
  });

  for (const r of results) {
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    process.exit(1);
  });
