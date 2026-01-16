/**
 * Populate featured_attractions field for all destinations
 * Pulls top 6 attractions from tiqets_attractions for each city
 */
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

interface FeaturedAttraction {
  id: string;
  title: string;
  slug: string;
  image: string;
  imageAlt: string;
  order: number;
  isActive: boolean;
}

interface CityMapping {
  destinationId: string;
  destinationName: string;
  tiqetsCityName: string;
}

// Map destination names to tiqets city names
const CITY_MAPPINGS: CityMapping[] = [
  { destinationId: 'dubai', destinationName: 'Dubai', tiqetsCityName: 'Dubai' },
  { destinationId: 'abu-dhabi', destinationName: 'Abu Dhabi', tiqetsCityName: 'Abu Dhabi' },
  { destinationId: 'paris', destinationName: 'Paris', tiqetsCityName: 'Paris' },
  { destinationId: 'london', destinationName: 'London', tiqetsCityName: 'London' },
  { destinationId: 'barcelona', destinationName: 'Barcelona', tiqetsCityName: 'Barcelona' },
  { destinationId: 'rome', destinationName: 'Rome', tiqetsCityName: 'Rome' },
  { destinationId: 'amsterdam', destinationName: 'Amsterdam', tiqetsCityName: 'Amsterdam' },
  { destinationId: 'new-york', destinationName: 'New York', tiqetsCityName: 'New York' },
  { destinationId: 'las-vegas', destinationName: 'Las Vegas', tiqetsCityName: 'Las Vegas' },
  { destinationId: 'istanbul', destinationName: 'Istanbul', tiqetsCityName: 'Istanbul' },
  { destinationId: 'miami', destinationName: 'Miami', tiqetsCityName: 'Miami' },
  { destinationId: 'los-angeles', destinationName: 'Los Angeles', tiqetsCityName: 'Los Angeles' },
  { destinationId: 'singapore', destinationName: 'Singapore', tiqetsCityName: 'Singapore' },
  { destinationId: 'bangkok', destinationName: 'Bangkok', tiqetsCityName: 'Bangkok' },
  { destinationId: 'tokyo', destinationName: 'Tokyo', tiqetsCityName: 'Tokyo' },
  { destinationId: 'hong-kong', destinationName: 'Hong Kong', tiqetsCityName: 'Hong Kong' },
];

async function getTopAttractions(cityName: string, limit: number = 6): Promise<FeaturedAttraction[]> {
  const result = await db.execute(sql`
    SELECT 
      id, 
      title, 
      slug, 
      tiqets_images
    FROM tiqets_attractions
    WHERE city_name = ${cityName}
      AND tiqets_images IS NOT NULL 
      AND jsonb_array_length(tiqets_images) > 0
    ORDER BY title
    LIMIT ${limit}
  `);

  return (result.rows as any[]).map((row, index) => {
    const images = row.tiqets_images as any[];
    const firstImage = images?.[0] || {};
    return {
      id: row.id,
      title: row.title,
      slug: `/attractions/${row.slug}`,
      image: firstImage.large || firstImage.medium || firstImage.small || '',
      imageAlt: firstImage.alt_text || row.title,
      order: index,
      isActive: true,
    };
  });
}

async function populateFeaturedAttractions() {
  console.log('🎯 Starting to populate featured_attractions for all destinations...\n');

  for (const mapping of CITY_MAPPINGS) {
    try {
      const attractions = await getTopAttractions(mapping.tiqetsCityName, 6);
      
      if (attractions.length === 0) {
        console.log(`⚠️  ${mapping.destinationName}: No attractions found in tiqets_attractions`);
        continue;
      }

      // Update the destinations table
      await db.execute(sql`
        UPDATE destinations 
        SET featured_attractions = ${JSON.stringify(attractions)}::jsonb,
            updated_at = NOW()
        WHERE id = ${mapping.destinationId}
      `);

      console.log(`✅ ${mapping.destinationName}: Populated ${attractions.length} attractions`);
      attractions.forEach(a => console.log(`   - ${a.title}`));
      
    } catch (error) {
      console.error(`❌ ${mapping.destinationName}: Error -`, error);
    }
  }

  console.log('\n🎉 Done populating featured_attractions!');
}

populateFeaturedAttractions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
