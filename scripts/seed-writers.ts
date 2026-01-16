import { db } from '../server/db';
import { aiWriters } from '@shared/schema';
import { WRITERS, CATEGORY_LABELS } from '@shared/writers.config';
import { eq } from 'drizzle-orm';

async function seedWriters() {
  let seededCount = 0;
  for (const w of WRITERS) {
    const existing = await db.select().from(aiWriters).where(eq(aiWriters.id, w.id));
    
    if (existing.length === 0) {
      await db.insert(aiWriters).values({
        id: w.id,
        name: w.name,
        slug: w.id,
        avatar: w.avatar,
        nationality: w.nationality,
        age: w.age,
        expertise: w.expertise,
        personality: w.voice.personality,
        writingStyle: w.writingStyle.tone,
        bio: w.background,
        shortBio: w.background.substring(0, 200) + '...',
        contentTypes: [CATEGORY_LABELS[w.category]],
        languages: ['en'],
        isActive: true,
        articleCount: 0
      });
      seededCount++;
      console.log(`Seeded writer: ${w.name}`);
    }
  }
  console.log(`Total seeded: ${seededCount} writers`);
  process.exit(0);
}

seedWriters().catch(console.error);
