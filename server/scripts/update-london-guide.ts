import { db } from '../db.js';
import { update9987Guides } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateLondonGuide() {
  console.log('Starting London Travel Guide 2026 update...');
  
  const htmlPath = join(__dirname, '../data/london-guide-full-content.html');
  const htmlContent = readFileSync(htmlPath, 'utf-8');
  
  console.log(`HTML content loaded: ${htmlContent.length} characters`);
  
  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "London Travel Guide 2026: Costs, Hotels, Best Time | TRAVI",
      metaDescription: "Discover London in 2026: honest costs from £70/day, 11 best neighborhoods, transport tips, free museums. Realistic guide for first-time visitors.",
      focusKeyword: "London travel guide 2026",
      updatedAt: new Date(),
    } as any)
    .where(eq(update9987Guides.slug, 'london-travel-guide'))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });
  
  if (result.length > 0) {
    console.log(`✅ Successfully updated London guide (ID: ${result[0].id})`);
    console.log(`   - Content length: ${htmlContent.length} characters`);
    console.log(`   - Slug: ${result[0].slug}`);
  } else {
    console.log('❌ No guide found with slug: london-travel-guide');
  }
  
  process.exit(0);
}

updateLondonGuide().catch((err) => {
  console.error('Failed to update London guide:', err);
  process.exit(1);
});
