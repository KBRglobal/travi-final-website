import { db } from '../db.js';
import { update9987Guides } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateBangkokGuide() {
  console.log('Starting Bangkok Travel Guide 2026 update...');
  
  const htmlPath = join(__dirname, '../data/bangkok-guide-full-content.html');
  const htmlContent = readFileSync(htmlPath, 'utf-8');
  
  console.log(`HTML content loaded: ${htmlContent.length} characters`);
  
  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Bangkok Travel Guide 2026: Costs, Temples, Street Food | TRAVI",
      metaDescription: "Discover Bangkok in 2026: honest costs from $40/day, Grand Palace tips, legendary street food, BTS navigation. Real traveler insights.",
      focusKeyword: "Bangkok travel guide 2026",
      updatedAt: new Date(),
    })
    .where(eq(update9987Guides.slug, 'bangkok-travel-guide'))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });
  
  if (result.length > 0) {
    console.log(`✅ Successfully updated Bangkok guide (ID: ${result[0].id})`);
    console.log(`   - Content length: ${htmlContent.length} characters`);
    console.log(`   - Slug: ${result[0].slug}`);
  } else {
    console.log('❌ No guide found with slug: bangkok-travel-guide');
    console.log('   Creating new guide entry...');
    
    // If no existing guide, try to create one
    const insertResult = await db
      .insert(update9987Guides)
      .values({
        slug: 'bangkok-travel-guide',
        destinationSlug: 'bangkok',
        originalTitle: 'Bangkok Travel Guide 2026',
        rewrittenContent: htmlContent,
        metaTitle: "Bangkok Travel Guide 2026: Costs, Temples, Street Food | TRAVI",
        metaDescription: "Discover Bangkok in 2026: honest costs from $40/day, Grand Palace tips, legendary street food, BTS navigation. Real traveler insights.",
        focusKeyword: "Bangkok travel guide 2026",
        status: 'published',
      })
      .returning({ id: update9987Guides.id, slug: update9987Guides.slug });
    
    if (insertResult.length > 0) {
      console.log(`✅ Created new Bangkok guide (ID: ${insertResult[0].id})`);
      console.log(`   - Content length: ${htmlContent.length} characters`);
      console.log(`   - Slug: ${insertResult[0].slug}`);
    }
  }
  
  process.exit(0);
}

updateBangkokGuide().catch((err) => {
  console.error('Failed to update Bangkok guide:', err);
  process.exit(1);
});
