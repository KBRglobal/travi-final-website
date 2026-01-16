import { db } from '../db.js';
import { update9987Guides } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateSingaporeGuide() {
  console.log('Starting Singapore Travel Guide 2026 update...');
  
  const htmlPath = join(__dirname, '../data/singapore-guide-full-content.html');
  const htmlContent = readFileSync(htmlPath, 'utf-8');
  
  console.log(`HTML content loaded: ${htmlContent.length} characters`);
  
  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Singapore Travel Guide 2026: Costs, Hotels, Best Time | TRAVI",
      metaDescription: "Discover Singapore in 2026: honest costs from $70/day, best hotels from $50, top attractions, insider tips. Realistic guide for first-time visitors.",
      focusKeyword: "Singapore travel guide 2026",
      updatedAt: new Date(),
    })
    .where(eq(update9987Guides.slug, 'singapore-travel-guide'))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });
  
  if (result.length > 0) {
    console.log(`✅ Successfully updated Singapore guide (ID: ${result[0].id})`);
    console.log(`   - Content length: ${htmlContent.length} characters`);
    console.log(`   - Slug: ${result[0].slug}`);
  } else {
    console.log('❌ No guide found with slug: singapore-travel-guide');
  }
  
  process.exit(0);
}

updateSingaporeGuide().catch((err) => {
  console.error('Failed to update Singapore guide:', err);
  process.exit(1);
});
