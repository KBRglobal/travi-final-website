import { db } from '../db.js';
import { update9987Guides } from '@shared/schema.js';
import { writeFileSync } from 'fs';

async function main() {
  console.log('Exporting guides as INSERT statements...');
  
  const guides = await db.select().from(update9987Guides);
  
  let sql = '-- Travel Guides INSERT statements\n';
  sql += '-- Run in Production Database\n\n';
  
  for (const guide of guides) {
    const escapedContent = guide.rewrittenContent 
      ? guide.rewrittenContent.replace(/'/g, "''") 
      : null;
    const escapedTitle = guide.metaTitle?.replace(/'/g, "''") || null;
    const escapedDesc = guide.metaDescription?.replace(/'/g, "''") || null;
    const escapedKeyword = guide.focusKeyword?.replace(/'/g, "''") || null;
    
    sql += `INSERT INTO update_9987_guides (id, slug, city_id, rewritten_content, meta_title, meta_description, focus_keyword, status, created_at, updated_at)
VALUES (
  ${guide.id},
  '${guide.slug}',
  ${guide.cityId || 'NULL'},
  ${escapedContent ? `'${escapedContent}'` : 'NULL'},
  ${escapedTitle ? `'${escapedTitle}'` : 'NULL'},
  ${escapedDesc ? `'${escapedDesc}'` : 'NULL'},
  ${escapedKeyword ? `'${escapedKeyword}'` : 'NULL'},
  '${guide.status || 'published'}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  rewritten_content = EXCLUDED.rewritten_content,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  focus_keyword = EXCLUDED.focus_keyword,
  status = EXCLUDED.status,
  updated_at = NOW();

`;
  }
  
  writeFileSync('database-exports/guides-inserts.sql', sql);
  console.log(`Exported ${guides.length} guides to database-exports/guides-inserts.sql`);
  console.log(`File size: ${(sql.length / 1024 / 1024).toFixed(2)} MB`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
