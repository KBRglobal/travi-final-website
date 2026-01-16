import { db } from '../db.js';
import { update9987Guides } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateMiamiGuide() {
  console.log('Starting Miami Travel Guide 2026 update...');
  
  const htmlPath = join(__dirname, '../data/miami-guide-full-content.html');
  const htmlContent = readFileSync(htmlPath, 'utf-8');
  
  console.log(`HTML content loaded: ${htmlContent.length} characters`);
  
  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Miami Travel Guide 2026: Beaches, Hotels, Costs | TRAVI",
      metaDescription: "Plan your Miami trip: honest costs from $120/day, 10 best beaches, Art Deco District, Cuban food spots. Real tips from travelers for 2026 visits.",
      focusKeyword: "Miami travel guide 2026",
      updatedAt: new Date(),
    })
    .where(eq(update9987Guides.slug, 'miami-travel-guide'))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });
  
  if (result.length > 0) {
    console.log(`✅ Successfully updated Miami guide (ID: ${result[0].id})`);
    console.log(`   - Content length: ${htmlContent.length} characters`);
    console.log(`   - Slug: ${result[0].slug}`);
  } else {
    console.log('❌ No guide found with slug: miami-travel-guide');
  }
  
  process.exit(0);
}

updateMiamiGuide().catch((err) => {
  console.error('Failed to update Miami guide:', err);
  process.exit(1);
});
