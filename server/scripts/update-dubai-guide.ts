import { db } from '../db.js';
import { update9987Guides } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateDubaiGuide() {
  console.log('Starting Dubai Travel Guide 2026 update...');
  
  const htmlPath = join(__dirname, '../data/dubai-guide-full-content.html');
  const htmlContent = readFileSync(htmlPath, 'utf-8');
  
  console.log(`HTML content loaded: ${htmlContent.length} characters`);
  
  const result = await db
    .update(update9987Guides)
    .set({
      rewrittenContent: htmlContent,
      metaTitle: "Dubai Travel Guide 2026: Costs, Hotels, Best Time | TRAVI",
      metaDescription: "Discover Dubai in 2026: honest costs from $100/day, Burj Khalifa tips, desert safaris, Old Dubai souks, best beaches. Real traveler insights.",
      focusKeyword: "Dubai travel guide 2026",
      updatedAt: new Date(),
    })
    .where(eq(update9987Guides.slug, 'dubai-travel-guide'))
    .returning({ id: update9987Guides.id, slug: update9987Guides.slug });
  
  if (result.length > 0) {
    console.log(`✅ Successfully updated Dubai guide (ID: ${result[0].id})`);
    console.log(`   - Content length: ${htmlContent.length} characters`);
    console.log(`   - Slug: ${result[0].slug}`);
  } else {
    console.log('❌ No guide found with slug: dubai-travel-guide');
    console.log('   Creating new guide entry...');
    
    const insertResult = await db
      .insert(update9987Guides)
      .values({
        slug: 'dubai-travel-guide',
        destination: 'Dubai',
        originalContent: '',
        rewrittenContent: htmlContent,
        metaTitle: "Dubai Travel Guide 2026: Costs, Hotels, Best Time | TRAVI",
        metaDescription: "Discover Dubai in 2026: honest costs from $100/day, Burj Khalifa tips, desert safaris, Old Dubai souks, best beaches. Real traveler insights.",
        focusKeyword: "Dubai travel guide 2026",
        status: 'published',
      })
      .returning({ id: update9987Guides.id, slug: update9987Guides.slug });
    
    if (insertResult.length > 0) {
      console.log(`✅ Created new Dubai guide (ID: ${insertResult[0].id})`);
    }
  }
  
  process.exit(0);
}

updateDubaiGuide().catch((err) => {
  console.error('Failed to update Dubai guide:', err);
  process.exit(1);
});
