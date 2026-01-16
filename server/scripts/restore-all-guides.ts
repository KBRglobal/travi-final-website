/**
 * Restore all guides from HTML files in server/data/
 */

import { db } from '../db.js';
import { update9987Guides } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GUIDES_TO_RESTORE = [
  { slug: 'istanbul-travel-guide', file: 'istanbul-guide-full-content.html', title: 'Istanbul' },
  { slug: 'hong-kong-travel-guide', file: 'hong-kong-guide-full-content.html', title: 'Hong Kong' },
  { slug: 'dubai-travel-guide', file: 'dubai-guide-full-content.html', title: 'Dubai' },
  { slug: 'barcelona-travel-guide', file: 'barcelona-guide-full-content.html', title: 'Barcelona' },
  { slug: 'bangkok-travel-guide', file: 'bangkok-guide-full-content.html', title: 'Bangkok' },
  { slug: 'amsterdam-travel-guide', file: 'amsterdam-guide-full-content.html', title: 'Amsterdam' },
];

async function restoreGuides() {
  console.log('='.repeat(50));
  console.log('RESTORING GUIDES FROM HTML FILES');
  console.log('='.repeat(50));

  for (const guide of GUIDES_TO_RESTORE) {
    const filePath = join(__dirname, '../data', guide.file);
    
    if (!existsSync(filePath)) {
      console.log(`❌ File not found: ${guide.file}`);
      continue;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      console.log(`📄 ${guide.title}: ${content.length.toLocaleString()} chars`);

      const result = await db
        .update(update9987Guides)
        .set({
          rewrittenContent: content,
          metaTitle: `${guide.title} Travel Guide 2026: Costs, Hotels, Best Time | TRAVI`,
          metaDescription: `Discover ${guide.title} in 2026: honest costs, local tips, best neighborhoods. Real traveler insights.`,
          focusKeyword: `${guide.title} travel guide 2026`,
          status: 'published',
          updatedAt: new Date(),
        })
        .where(eq(update9987Guides.slug, guide.slug))
        .returning({ id: update9987Guides.id });

      if (result.length > 0) {
        console.log(`✅ ${guide.title} restored (ID: ${result[0].id})`);
      } else {
        console.log(`⚠️ ${guide.title} not found in database`);
      }
    } catch (error) {
      console.log(`❌ Error restoring ${guide.title}:`, error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('RESTORATION COMPLETE');
  console.log('='.repeat(50));

  process.exit(0);
}

restoreGuides().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
