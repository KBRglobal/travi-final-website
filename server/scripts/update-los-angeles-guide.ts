import { db } from '../db.js';
import { update9987Guides } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateLosAngelesGuide() {
  console.log('Starting Los Angeles Travel Guide 2026 update...');
  
  const htmlPath = join(__dirname, '../data/los-angeles-guide-full-content.html');
  const htmlContent = readFileSync(htmlPath, 'utf-8');
  
  console.log(`HTML content loaded: ${htmlContent.length} characters`);
  
  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Los Angeles Travel Guide 2026: Costs, Hotels, Best Time | TRAVI",
      metaDescription: "Discover LA in 2026: honest costs from $120/day, 8 best neighborhoods, Hollywood to beaches. Realistic guide for first-time visitors with verified tips.",
      focusKeyword: "Los Angeles travel guide 2026",
      updatedAt: new Date(),
    })
    .where(eq(update9987Guides.slug, 'los-angeles-travel-guide'))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });
  
  if (result.length > 0) {
    console.log(`✅ Successfully updated Los Angeles guide (ID: ${result[0].id})`);
    console.log(`   - Content length: ${htmlContent.length} characters`);
    console.log(`   - Slug: ${result[0].slug}`);
  } else {
    console.log('❌ No guide found with slug: los-angeles-travel-guide');
  }
  
  process.exit(0);
}

updateLosAngelesGuide().catch((err) => {
  console.error('Failed to update Los Angeles guide:', err);
  process.exit(1);
});
