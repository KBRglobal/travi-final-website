import { db } from '../db.js';
import { update9987Guides } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateHongKongGuide() {
  console.log('Starting Hong Kong Travel Guide 2026 update...');
  
  const htmlPath = join(__dirname, '../data/hong-kong-guide-full-content.html');
  const htmlContent = readFileSync(htmlPath, 'utf-8');
  
  console.log(`HTML content loaded: ${htmlContent.length} characters`);
  
  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Hong Kong Travel Guide 2026: Costs, Hotels, Best Time | TRAVI",
      metaDescription: "Discover Hong Kong in 2026: honest costs from HK$600/day, Victoria Peak, dim sum guide, MTR tips. Real traveler insights for first-timers.",
      focusKeyword: "Hong Kong travel guide 2026",
      updatedAt: new Date(),
    })
    .where(eq(update9987Guides.slug, 'hong-kong-travel-guide'))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });
  
  if (result.length > 0) {
    console.log(`✅ Successfully updated Hong Kong guide (ID: ${result[0].id})`);
    console.log(`   - Content length: ${htmlContent.length} characters`);
    console.log(`   - Slug: ${result[0].slug}`);
  } else {
    console.log('❌ No guide found with slug: hong-kong-travel-guide');
  }
  
  process.exit(0);
}

updateHongKongGuide().catch((err) => {
  console.error('Failed to update Hong Kong guide:', err);
  process.exit(1);
});
