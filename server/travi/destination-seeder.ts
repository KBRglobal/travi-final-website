/**
 * TRAVI Content Generation - Destination Seeder
 * 
 * Seeds the 16 whitelisted destinations with verified coordinates,
 * metadata, and initial configuration for content generation.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { WHITELISTED_DESTINATIONS, getDestinationBySlug, type DestinationSlug } from './validation';

// Re-export for backward compatibility
export { getDestinationBySlug, type DestinationSlug };

// Extended destination data with tourism metadata
export const DESTINATION_METADATA = [
  {
    slug: 'dubai',
    city: 'Dubai',
    country: 'UAE',
    continent: 'Asia',
    timezone: 'Asia/Dubai',
    currency: 'AED',
    languages: ['Arabic', 'English'],
    iataCode: 'DXB',
    climate: 'Desert',
    bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    attractionCount: 100,
    restaurantCount: 200,
    hotelCount: 150,
    center: { lat: 25.2048, lng: 55.2708 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Dubai',
    osmRelationId: '4479752',
  },
  {
    slug: 'abu-dhabi',
    city: 'Abu Dhabi',
    country: 'UAE',
    continent: 'Asia',
    timezone: 'Asia/Dubai',
    currency: 'AED',
    languages: ['Arabic', 'English'],
    iataCode: 'AUH',
    climate: 'Desert',
    bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    attractionCount: 60,
    restaurantCount: 120,
    hotelCount: 80,
    center: { lat: 24.4539, lng: 54.3773 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Abu_Dhabi',
    osmRelationId: '3766483',
  },
  {
    slug: 'london',
    city: 'London',
    country: 'United Kingdom',
    continent: 'Europe',
    timezone: 'Europe/London',
    currency: 'GBP',
    languages: ['English'],
    iataCode: 'LHR',
    climate: 'Temperate',
    bestMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    attractionCount: 150,
    restaurantCount: 300,
    hotelCount: 200,
    center: { lat: 51.5074, lng: -0.1278 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/London',
    osmRelationId: '65606',
  },
  {
    slug: 'paris',
    city: 'Paris',
    country: 'France',
    continent: 'Europe',
    timezone: 'Europe/Paris',
    currency: 'EUR',
    languages: ['French'],
    iataCode: 'CDG',
    climate: 'Temperate',
    bestMonths: ['Apr', 'May', 'Jun', 'Sep', 'Oct'],
    attractionCount: 140,
    restaurantCount: 280,
    hotelCount: 180,
    center: { lat: 48.8566, lng: 2.3522 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Paris',
    osmRelationId: '7444',
  },
  {
    slug: 'new-york',
    city: 'New York',
    country: 'USA',
    continent: 'North America',
    timezone: 'America/New_York',
    currency: 'USD',
    languages: ['English'],
    iataCode: 'JFK',
    climate: 'Humid Continental',
    bestMonths: ['Apr', 'May', 'Jun', 'Sep', 'Oct'],
    attractionCount: 160,
    restaurantCount: 350,
    hotelCount: 220,
    center: { lat: 40.7128, lng: -74.0060 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/New_York_City',
    osmRelationId: '175905',
  },
  {
    slug: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    continent: 'Asia',
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    languages: ['Japanese'],
    iataCode: 'HND',
    climate: 'Humid Subtropical',
    bestMonths: ['Mar', 'Apr', 'May', 'Oct', 'Nov'],
    attractionCount: 130,
    restaurantCount: 320,
    hotelCount: 190,
    center: { lat: 35.6762, lng: 139.6503 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Tokyo',
    osmRelationId: '1543125',
  },
  {
    slug: 'singapore',
    city: 'Singapore',
    country: 'Singapore',
    continent: 'Asia',
    timezone: 'Asia/Singapore',
    currency: 'SGD',
    languages: ['English', 'Mandarin', 'Malay', 'Tamil'],
    iataCode: 'SIN',
    climate: 'Tropical',
    bestMonths: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    attractionCount: 80,
    restaurantCount: 180,
    hotelCount: 120,
    center: { lat: 1.3521, lng: 103.8198 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Singapore',
    osmRelationId: '536780',
  },
  {
    slug: 'bangkok',
    city: 'Bangkok',
    country: 'Thailand',
    continent: 'Asia',
    timezone: 'Asia/Bangkok',
    currency: 'THB',
    languages: ['Thai', 'English'],
    iataCode: 'BKK',
    climate: 'Tropical',
    bestMonths: ['Nov', 'Dec', 'Jan', 'Feb'],
    attractionCount: 90,
    restaurantCount: 200,
    hotelCount: 140,
    center: { lat: 13.7563, lng: 100.5018 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Bangkok',
    osmRelationId: '92277',
  },
  {
    slug: 'barcelona',
    city: 'Barcelona',
    country: 'Spain',
    continent: 'Europe',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    languages: ['Spanish', 'Catalan'],
    iataCode: 'BCN',
    climate: 'Mediterranean',
    bestMonths: ['Apr', 'May', 'Jun', 'Sep', 'Oct'],
    attractionCount: 85,
    restaurantCount: 190,
    hotelCount: 130,
    center: { lat: 41.3851, lng: 2.1734 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Barcelona',
    osmRelationId: '347950',
  },
  {
    slug: 'rome',
    city: 'Rome',
    country: 'Italy',
    continent: 'Europe',
    timezone: 'Europe/Rome',
    currency: 'EUR',
    languages: ['Italian'],
    iataCode: 'FCO',
    climate: 'Mediterranean',
    bestMonths: ['Apr', 'May', 'Sep', 'Oct'],
    attractionCount: 120,
    restaurantCount: 220,
    hotelCount: 150,
    center: { lat: 41.9028, lng: 12.4964 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Rome',
    osmRelationId: '41485',
  },
  {
    slug: 'amsterdam',
    city: 'Amsterdam',
    country: 'Netherlands',
    continent: 'Europe',
    timezone: 'Europe/Amsterdam',
    currency: 'EUR',
    languages: ['Dutch', 'English'],
    iataCode: 'AMS',
    climate: 'Oceanic',
    bestMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    attractionCount: 70,
    restaurantCount: 160,
    hotelCount: 100,
    center: { lat: 52.3676, lng: 4.9041 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Amsterdam',
    osmRelationId: '271110',
  },
  {
    slug: 'hong-kong',
    city: 'Hong Kong',
    country: 'Hong Kong',
    continent: 'Asia',
    timezone: 'Asia/Hong_Kong',
    currency: 'HKD',
    languages: ['Cantonese', 'English', 'Mandarin'],
    iataCode: 'HKG',
    climate: 'Humid Subtropical',
    bestMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    attractionCount: 75,
    restaurantCount: 190,
    hotelCount: 110,
    center: { lat: 22.3193, lng: 114.1694 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Hong_Kong',
    osmRelationId: '913110',
  },
  {
    slug: 'istanbul',
    city: 'Istanbul',
    country: 'Turkey',
    continent: 'Europe/Asia',
    timezone: 'Europe/Istanbul',
    currency: 'TRY',
    languages: ['Turkish'],
    iataCode: 'IST',
    climate: 'Mediterranean',
    bestMonths: ['Apr', 'May', 'Sep', 'Oct'],
    attractionCount: 95,
    restaurantCount: 180,
    hotelCount: 130,
    center: { lat: 41.0082, lng: 28.9784 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Istanbul',
    osmRelationId: '223474',
  },
  {
    slug: 'las-vegas',
    city: 'Las Vegas',
    country: 'USA',
    continent: 'North America',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    languages: ['English'],
    iataCode: 'LAS',
    climate: 'Hot Desert',
    bestMonths: ['Mar', 'Apr', 'May', 'Sep', 'Oct', 'Nov'],
    attractionCount: 80,
    restaurantCount: 200,
    hotelCount: 150,
    center: { lat: 36.1699, lng: -115.1398 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Las_Vegas',
    osmRelationId: '170117',
  },
  {
    slug: 'los-angeles',
    city: 'Los Angeles',
    country: 'USA',
    continent: 'North America',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    languages: ['English', 'Spanish'],
    iataCode: 'LAX',
    climate: 'Mediterranean',
    bestMonths: ['Mar', 'Apr', 'May', 'Sep', 'Oct', 'Nov'],
    attractionCount: 100,
    restaurantCount: 250,
    hotelCount: 160,
    center: { lat: 34.0522, lng: -118.2437 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Los_Angeles',
    osmRelationId: '207359',
  },
  {
    slug: 'miami',
    city: 'Miami',
    country: 'USA',
    continent: 'North America',
    timezone: 'America/New_York',
    currency: 'USD',
    languages: ['English', 'Spanish'],
    iataCode: 'MIA',
    climate: 'Tropical Monsoon',
    bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
    attractionCount: 70,
    restaurantCount: 180,
    hotelCount: 120,
    center: { lat: 25.7617, lng: -80.1918 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Miami',
    osmRelationId: '1216769',
  },
  {
    slug: 'ras-al-khaimah',
    city: 'Ras Al Khaimah',
    country: 'UAE',
    continent: 'Asia',
    timezone: 'Asia/Dubai',
    currency: 'AED',
    languages: ['Arabic', 'English'],
    iataCode: 'RKT',
    climate: 'Desert',
    bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    attractionCount: 25,
    restaurantCount: 50,
    hotelCount: 40,
    center: { lat: 25.7895, lng: 55.9432 },
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ras_Al_Khaimah',
    osmRelationId: '3766486',
  },
] as const;

// Seed destinations to database
export async function seedDestinations(): Promise<{
  seeded: number;
  skipped: number;
  errors: string[];
}> {
  let seeded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const dest of DESTINATION_METADATA) {
    try {
      // Check if destination already exists
      const existing = await db.execute(sql`
        SELECT id FROM destinations WHERE id = ${dest.slug}
      `);

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Insert destination
      await db.execute(sql`
        INSERT INTO destinations (
          id, name, country, slug, destination_level,
          card_image, card_image_alt, summary
        )
        VALUES (
          ${dest.slug},
          ${dest.city},
          ${dest.country},
          ${'/destinations/' + dest.slug},
          'city',
          ${'/cards/' + dest.slug + '.webp'},
          ${dest.city + ' cityscape - Explore ' + dest.city + ', ' + dest.country},
          ${'Discover amazing attractions, hotels, and dining in ' + dest.city}
        )
      `);

      seeded++;
      console.log(`[DestinationSeeder] Seeded: ${dest.city}, ${dest.country}`);
    } catch (error: any) {
      errors.push(`${dest.slug}: ${error.message}`);
      console.error(`[DestinationSeeder] Failed to seed ${dest.slug}:`, error);
    }
  }

  console.log(`[DestinationSeeder] Complete: ${seeded} seeded, ${skipped} skipped, ${errors.length} errors`);
  return { seeded, skipped, errors };
}

// Get destination metadata by slug
export function getDestinationMetadata(slug: string) {
  return DESTINATION_METADATA.find(d => d.slug === slug);
}

// Get all destination slugs
export function getAllDestinationSlugs(): string[] {
  return DESTINATION_METADATA.map(d => d.slug);
}

// Check if a slug is a valid whitelisted destination
export function isValidDestination(slug: string): boolean {
  return DESTINATION_METADATA.some(d => d.slug === slug);
}

// Get destinations by continent
export function getDestinationsByContinent(continent: string) {
  return DESTINATION_METADATA.filter(d => d.continent.includes(continent));
}

// Get total estimated locations for all destinations
export function getTotalEstimatedLocations(): {
  attractions: number;
  restaurants: number;
  hotels: number;
  total: number;
} {
  const totals = DESTINATION_METADATA.reduce(
    (acc, d) => ({
      attractions: acc.attractions + d.attractionCount,
      restaurants: acc.restaurants + d.restaurantCount,
      hotels: acc.hotels + d.hotelCount,
    }),
    { attractions: 0, restaurants: 0, hotels: 0 }
  );

  return {
    ...totals,
    total: totals.attractions + totals.restaurants + totals.hotels,
  };
}
