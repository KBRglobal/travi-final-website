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

const client = new Client();
const EXPORT_PREFIX = "db-exports";

async function exportTable(tableName: string, data: any[]) {
  const key = `${EXPORT_PREFIX}/${tableName}.json`;
  const jsonData = JSON.stringify(data);
  await client.uploadFromText(key, jsonData);

  return { table: tableName, rows: data.length, size: jsonData.length };
}

async function main() {
  const exports: { table: string; rows: number; size: number }[] = [];

  const guides = await db.select().from(update9987Guides);
  exports.push(await exportTable("update_9987_guides", guides));

  const countries = await db.select().from(update9987Countries);
  exports.push(await exportTable("update_9987_countries", countries));

  const states = await db.select().from(update9987States);
  exports.push(await exportTable("update_9987_states", states));

  const holidays = await db.select().from(update9987PublicHolidays);
  exports.push(await exportTable("update_9987_public_holidays", holidays));

  const attractions = await db.select().from(tiqetsAttractions);
  exports.push(await exportTable("tiqets_attractions", attractions));

  const visas = await db.select().from(visaRequirements);
  exports.push(await exportTable("visa_requirements", visas));

  const events = await db.select().from(destinationEvents);
  exports.push(await exportTable("destination_events", events));

  const pois = await db.select().from(update9987TourpediaPois);
  exports.push(await exportTable("update_9987_tourpedia_pois", pois));

  const manifest = {
    exportedAt: new Date().toISOString(),
    tables: exports,
    totalRows: exports.reduce((sum, e) => sum + e.rows, 0),
    totalSize: exports.reduce((sum, e) => sum + e.size, 0),
  };

  await client.uploadFromText(`${EXPORT_PREFIX}/manifest.json`, JSON.stringify(manifest, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    process.exit(1);
  });
