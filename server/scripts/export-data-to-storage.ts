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

const client = new Client();
const EXPORT_PREFIX = 'db-exports';

async function exportTable(tableName: string, data: any[]) {
  const key = `${EXPORT_PREFIX}/${tableName}.json`;
  const jsonData = JSON.stringify(data);
  await client.uploadFromText(key, jsonData);
  console.log(`  Exported ${tableName}: ${data.length} rows (${(jsonData.length / 1024).toFixed(1)} KB)`);
  return { table: tableName, rows: data.length, size: jsonData.length };
}

async function main() {
  console.log('Exporting all data to Object Storage...\n');
  
  const exports: { table: string; rows: number; size: number }[] = [];

  console.log('1. Exporting update_9987_guides...');
  const guides = await db.select().from(update9987Guides);
  exports.push(await exportTable('update_9987_guides', guides));

  console.log('2. Exporting update_9987_countries...');
  const countries = await db.select().from(update9987Countries);
  exports.push(await exportTable('update_9987_countries', countries));

  console.log('3. Exporting update_9987_states...');
  const states = await db.select().from(update9987States);
  exports.push(await exportTable('update_9987_states', states));

  console.log('4. Exporting update_9987_public_holidays...');
  const holidays = await db.select().from(update9987PublicHolidays);
  exports.push(await exportTable('update_9987_public_holidays', holidays));

  console.log('5. Exporting tiqets_attractions...');
  const attractions = await db.select().from(tiqetsAttractions);
  exports.push(await exportTable('tiqets_attractions', attractions));

  console.log('6. Exporting visa_requirements...');
  const visas = await db.select().from(visaRequirements);
  exports.push(await exportTable('visa_requirements', visas));

  console.log('7. Exporting destination_events...');
  const events = await db.select().from(destinationEvents);
  exports.push(await exportTable('destination_events', events));

  console.log('8. Exporting update_9987_tourpedia_pois...');
  const pois = await db.select().from(update9987TourpediaPois);
  exports.push(await exportTable('update_9987_tourpedia_pois', pois));

  const manifest = {
    exportedAt: new Date().toISOString(),
    tables: exports,
    totalRows: exports.reduce((sum, e) => sum + e.rows, 0),
    totalSize: exports.reduce((sum, e) => sum + e.size, 0),
  };
  
  await client.uploadFromText(`${EXPORT_PREFIX}/manifest.json`, JSON.stringify(manifest, null, 2));
  
  console.log('\n=== Export Summary ===');
  console.log(`Total tables: ${exports.length}`);
  console.log(`Total rows: ${manifest.totalRows.toLocaleString()}`);
  console.log(`Total size: ${(manifest.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('\nAll data exported to Object Storage successfully!');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
