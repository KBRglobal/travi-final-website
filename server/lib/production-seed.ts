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
import { count } from 'drizzle-orm';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { gunzipSync } from 'zlib';
import { fileURLToPath } from 'url';

const moduleDir = typeof __dirname !== 'undefined' 
  ? __dirname 
  : dirname(fileURLToPath(import.meta.url));
const SEED_DATA_DIR = join(moduleDir, '..', 'data', 'seed');

async function loadTable(tableName: string): Promise<any[]> {
  const gzPath = join(SEED_DATA_DIR, `${tableName}.json.gz`);
  try {
    if (!existsSync(gzPath)) {
      console.log(`[ProdSeed] File not found: ${gzPath}`);
      return [];
    }
    const compressed = readFileSync(gzPath);
    const content = gunzipSync(compressed).toString('utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.log(`[ProdSeed] Error loading ${tableName}: ${e}`);
    return [];
  }
}

async function seedTable(tableName: string, table: any, data: any[], batchSize = 100): Promise<number> {
  if (data.length === 0) return 0;

  console.log(`[ProdSeed] Seeding ${tableName}: ${data.length} rows...`);
  
  let inserted = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      await db.insert(table).values(batch).onConflictDoNothing();
      inserted += batch.length;
      if (i % 1000 === 0 && i > 0) {
        console.log(`[ProdSeed] ${tableName}: ${i}/${data.length} processed...`);
      }
    } catch (e: any) {
      console.log(`[ProdSeed] Batch error in ${tableName}: ${e.message?.slice(0, 80)}`);
    }
  }
  
  console.log(`[ProdSeed] Completed ${tableName}: ${inserted} rows inserted`);
  return inserted;
}

export async function runProductionSeed(): Promise<void> {
  if (process.env.RUN_PROD_SEED !== 'true') {
    return;
  }

  console.log('[ProdSeed] ========================================');
  console.log('[ProdSeed] Production Database Seed Starting...');
  console.log('[ProdSeed] ========================================');
  
  try {
    const manifestPath = join(SEED_DATA_DIR, 'manifest.json');
    if (!existsSync(manifestPath)) {
      console.log('[ProdSeed] No seed manifest found. Skipping seed.');
      console.log('[ProdSeed] Expected path:', manifestPath);
      return;
    }
    
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    console.log(`[ProdSeed] Found export from: ${manifest.exportedAt}`);
    console.log(`[ProdSeed] Total rows to import: ${manifest.totalRows.toLocaleString()}`);

    const existingGuides = await db.select({ count: count() }).from(update9987Guides);
    const existingAttractions = await db.select({ count: count() }).from(tiqetsAttractions);
    const existingVisas = await db.select({ count: count() }).from(visaRequirements);
    
    console.log(`[ProdSeed] Current DB state: guides=${existingGuides[0]?.count}, attractions=${existingAttractions[0]?.count}, visas=${existingVisas[0]?.count}`);

    const guides = await loadTable('update_9987_guides');
    await seedTable('update_9987_guides', update9987Guides, guides);

    const countries = await loadTable('update_9987_countries');
    await seedTable('update_9987_countries', update9987Countries, countries);

    const states = await loadTable('update_9987_states');
    await seedTable('update_9987_states', update9987States, states);

    const holidays = await loadTable('update_9987_public_holidays');
    await seedTable('update_9987_public_holidays', update9987PublicHolidays, holidays);

    const attractions = await loadTable('tiqets_attractions');
    await seedTable('tiqets_attractions', tiqetsAttractions, attractions);

    const visas = await loadTable('visa_requirements');
    await seedTable('visa_requirements', visaRequirements, visas);

    const events = await loadTable('destination_events');
    await seedTable('destination_events', destinationEvents, events);

    const pois = await loadTable('update_9987_tourpedia_pois');
    await seedTable('update_9987_tourpedia_pois', update9987TourpediaPois, pois, 500);

    console.log('[ProdSeed] ========================================');
    console.log('[ProdSeed] Production Database Seed Complete!');
    console.log('[ProdSeed] ========================================');
    
  } catch (error) {
    console.error('[ProdSeed] Seed failed:', error);
  }
}
