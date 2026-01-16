import { db } from '../db.js';
import { 
  update9987Guides, 
  update9987Countries, 
  update9987States,
  update9987PublicHolidays,
  update9987TourpediaPois,
  tiqetsAttractions,
  visaRequirements,
  destinationEvents
} from '@shared/schema.js';
import { Client } from "@replit/object-storage";
import { sql } from 'drizzle-orm';

const client = new Client();
const EXPORT_PREFIX = 'db-exports';

async function loadTable(tableName: string): Promise<any[]> {
  const key = `${EXPORT_PREFIX}/${tableName}.json`;
  try {
    const result = await client.downloadAsText(key);
    if (result.ok) {
      return JSON.parse(result.value);
    } else {
      console.log(`  Warning: Could not load ${tableName}: ${result.error}`);
      return [];
    }
  } catch (e) {
    console.log(`  Error loading ${tableName}: ${e}`);
    return [];
  }
}

async function seedTable(tableName: string, table: any, data: any[], batchSize = 100) {
  if (data.length === 0) {
    console.log(`  Skipping ${tableName}: no data`);
    return 0;
  }

  console.log(`  Seeding ${tableName}: ${data.length} rows...`);
  
  let inserted = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      await db.insert(table).values(batch).onConflictDoNothing();
      inserted += batch.length;
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= data.length) {
        console.log(`    Progress: ${Math.min(i + batchSize, data.length)}/${data.length}`);
      }
    } catch (e: any) {
      console.log(`    Batch error at ${i}: ${e.message?.slice(0, 100)}`);
    }
  }
  
  return inserted;
}

async function main() {
  console.log('=== Production Database Seed from Object Storage ===\n');
  
  const manifestResult = await client.downloadAsText(`${EXPORT_PREFIX}/manifest.json`);
  if (!manifestResult.ok) {
    console.error('No export manifest found. Run export-data-to-storage.ts first.');
    process.exit(1);
  }
  
  const manifest = JSON.parse(manifestResult.value);
  console.log(`Export timestamp: ${manifest.exportedAt}`);
  console.log(`Total rows to import: ${manifest.totalRows.toLocaleString()}\n`);

  const results: { table: string; inserted: number }[] = [];

  console.log('1. Loading and seeding update_9987_guides...');
  const guides = await loadTable('update_9987_guides');
  results.push({ table: 'update_9987_guides', inserted: await seedTable('update_9987_guides', update9987Guides, guides) });

  console.log('2. Loading and seeding update_9987_countries...');
  const countries = await loadTable('update_9987_countries');
  results.push({ table: 'update_9987_countries', inserted: await seedTable('update_9987_countries', update9987Countries, countries) });

  console.log('3. Loading and seeding update_9987_states...');
  const states = await loadTable('update_9987_states');
  results.push({ table: 'update_9987_states', inserted: await seedTable('update_9987_states', update9987States, states) });

  console.log('4. Loading and seeding update_9987_public_holidays...');
  const holidays = await loadTable('update_9987_public_holidays');
  results.push({ table: 'update_9987_public_holidays', inserted: await seedTable('update_9987_public_holidays', update9987PublicHolidays, holidays) });

  console.log('5. Loading and seeding tiqets_attractions...');
  const attractions = await loadTable('tiqets_attractions');
  results.push({ table: 'tiqets_attractions', inserted: await seedTable('tiqets_attractions', tiqetsAttractions, attractions) });

  console.log('6. Loading and seeding visa_requirements...');
  const visas = await loadTable('visa_requirements');
  results.push({ table: 'visa_requirements', inserted: await seedTable('visa_requirements', visaRequirements, visas) });

  console.log('7. Loading and seeding destination_events...');
  const events = await loadTable('destination_events');
  results.push({ table: 'destination_events', inserted: await seedTable('destination_events', destinationEvents, events) });

  console.log('8. Loading and seeding update_9987_tourpedia_pois...');
  const pois = await loadTable('update_9987_tourpedia_pois');
  results.push({ table: 'update_9987_tourpedia_pois', inserted: await seedTable('update_9987_tourpedia_pois', update9987TourpediaPois, pois, 500) });

  console.log('\n=== Seed Summary ===');
  for (const r of results) {
    console.log(`  ${r.table}: ${r.inserted.toLocaleString()} rows`);
  }
  console.log(`\nTotal inserted: ${results.reduce((sum, r) => sum + r.inserted, 0).toLocaleString()} rows`);
  console.log('\nDatabase seed complete!');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
