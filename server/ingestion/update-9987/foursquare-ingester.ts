/**
 * Update 9987 - Foursquare OS Places Ingester
 * Source: https://opensource.foursquare.com/os-places
 * 
 * Foursquare Open Source Places provides 100M+ global POIs with Apache 2.0 license.
 * Data includes: hotels, restaurants, attractions, categories, opening hours.
 * 
 * PRODUCTION REQUIREMENTS:
 * ========================
 * Foursquare OS Places data is distributed via:
 * 1. Hugging Face: huggingface.co/datasets/foursquare/fsq-os-places
 * 2. AWS S3 Parquet files: s3://fsq-os-places-us-east-1/release/dt=YYYY-MM-DD/places/parquet/
 * 
 * Both require specialized tooling:
 * - Hugging Face: Python huggingface_hub library
 * - S3 Parquet: DuckDB with spatial extension (similar to Overture Maps)
 * 
 * This ingester is a PLACEHOLDER that generates sample data for schema testing.
 * For production, implement one of:
 * 1. DuckDB integration for S3 Parquet queries
 * 2. Pre-process Hugging Face dataset to CSV/JSON
 * 3. Use Foursquare API for incremental updates (requires API key)
 * 
 * Parquet Schema (key fields):
 * - fsq_id: Unique Foursquare place ID
 * - name: Place name
 * - latitude, longitude: Coordinates
 * - address, locality, region, postcode, country
 * - category_ids, category_labels: Category taxonomy
 * - chain_id, chain_name: Chain/franchise info
 * - date_created, date_refreshed: Temporal metadata
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { update9987FoursquarePois } from '@shared/schema';
import { sql } from 'drizzle-orm';
import * as h3 from 'h3-js';

// Priority cities for sample data generation
const SAMPLE_CITIES = [
  { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708 },
  { name: 'Abu Dhabi', country: 'AE', lat: 24.4539, lon: 54.3773 },
  { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
  { name: 'Barcelona', country: 'ES', lat: 41.3851, lon: 2.1734 },
  { name: 'Rome', country: 'IT', lat: 41.9028, lon: 12.4964 },
  { name: 'Amsterdam', country: 'NL', lat: 52.3676, lon: 4.9041 },
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
  { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
  { name: 'Bangkok', country: 'TH', lat: 13.7563, lon: 100.5018 },
  { name: 'Hong Kong', country: 'HK', lat: 22.3193, lon: 114.1694 },
  { name: 'Istanbul', country: 'TR', lat: 41.0082, lon: 28.9784 },
  { name: 'Las Vegas', country: 'US', lat: 36.1699, lon: -115.1398 },
  { name: 'New York', country: 'US', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles', country: 'US', lat: 34.0522, lon: -118.2437 },
  { name: 'Miami', country: 'US', lat: 25.7617, lon: -80.1918 },
];

const SAMPLE_CATEGORIES = [
  { id: '13000', name: 'Dining and Drinking' },
  { id: '13003', name: 'Restaurant' },
  { id: '13032', name: 'Café' },
  { id: '13065', name: 'Bar' },
  { id: '16000', name: 'Landmarks and Outdoors' },
  { id: '16003', name: 'Historic Site' },
  { id: '16019', name: 'Monument' },
  { id: '19000', name: 'Travel and Transportation' },
  { id: '19009', name: 'Hotel' },
  { id: '19014', name: 'Resort' },
  { id: '10000', name: 'Arts and Entertainment' },
  { id: '10024', name: 'Museum' },
  { id: '10027', name: 'Theater' },
];

export class FoursquareIngester extends BaseIngester {
  source: DataSource = {
    id: 'foursquare',
    name: 'Foursquare OS Places',
    displayName: 'Foursquare',
    description: '100M+ global POIs with Apache 2.0 license (PLACEHOLDER - requires DuckDB/Parquet)',
    type: 'file',
    baseUrl: 'https://opensource.foursquare.com/os-places',
    config: {
      // DISABLED until DuckDB is configured for production use
      enabled: false,
      cronSchedule: '0 5 * * 0', // Weekly on Sunday at 5am
      batchSize: 1000,
      retryAttempts: 3,
    },
  };

  async ingest(): Promise<IngestionResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    const errors: Array<{ message: string; data?: unknown }> = [];

    try {
      this.log('Starting Foursquare OS Places ingestion');
      this.log('NOTE: This is a PLACEHOLDER implementation with sample data');
      this.log('For production, implement DuckDB + S3 Parquet integration');

      // Generate sample POIs for each city
      for (const city of SAMPLE_CITIES) {
        try {
          const result = await this.generateSamplePoisForCity(city);
          totalCreated += result.created;
          totalUpdated += result.updated;
          recordsProcessed += result.processed;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ message: `Failed to process city ${city.name}: ${message}` });
          this.logError(`Failed to process city ${city.name}`, error);
        }
      }

      this.log('Foursquare sample data generation completed');
      this.log(`Generated ${recordsProcessed} sample POIs for ${SAMPLE_CITIES.length} cities`);

      return this.createResult({
        recordsProcessed,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        errors,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      this.logError('Foursquare ingestion failed', error);
      return this.createResult({
        recordsProcessed,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        errors: [...errors, { message: error instanceof Error ? error.message : 'Unknown error' }],
        durationMs: Date.now() - startTime,
        status: 'failed',
      });
    }
  }

  private async generateSamplePoisForCity(
    city: typeof SAMPLE_CITIES[number]
  ): Promise<{ processed: number; created: number; updated: number }> {
    this.log(`Generating sample Foursquare POIs for ${city.name}, ${city.country}`);

    const records: Array<typeof update9987FoursquarePois.$inferInsert> = [];
    const poisPerCity = 50; // Generate 50 sample POIs per city

    for (let i = 0; i < poisPerCity; i++) {
      // Random offset within ~5km of city center
      const latOffset = (Math.random() - 0.5) * 0.1;
      const lonOffset = (Math.random() - 0.5) * 0.1;
      const lat = city.lat + latOffset;
      const lon = city.lon + lonOffset;

      // Random category
      const category = SAMPLE_CATEGORIES[Math.floor(Math.random() * SAMPLE_CATEGORIES.length)];

      // Generate H3 index
      let h3Index: string | undefined;
      try {
        h3Index = h3.latLngToCell(lat, lon, 9);
      } catch {
        // Invalid coordinates
      }

      const fsqId = `fsq-sample-${city.country.toLowerCase()}-${city.name.toLowerCase().replace(/\s+/g, '-')}-${i}`;

      records.push({
        fsqId,
        name: `Sample ${category.name} ${i + 1}`,
        latitude: lat.toFixed(6),
        longitude: lon.toFixed(6),
        address: `${Math.floor(Math.random() * 999) + 1} Sample Street`,
        locality: city.name,
        region: city.name,
        postcode: `${Math.floor(Math.random() * 90000) + 10000}`,
        countryCode: city.country,
        categoryId: category.id,
        categoryName: category.name,
        dateCreated: new Date().toISOString().split('T')[0],
        dateRefreshed: new Date().toISOString().split('T')[0],
        h3Index,
      });
    }

    // Import batch
    return await this.importBatch(records);
  }

  private async importBatch(
    records: Array<typeof update9987FoursquarePois.$inferInsert>
  ): Promise<{ processed: number; created: number; updated: number }> {
    if (records.length === 0) {
      return { processed: 0, created: 0, updated: 0 };
    }

    try {
      // Upsert with conflict handling on fsq_id
      await db
        .insert(update9987FoursquarePois)
        .values(records)
        .onConflictDoUpdate({
          target: update9987FoursquarePois.fsqId,
          set: {
            name: sql`excluded.name`,
            latitude: sql`excluded.latitude`,
            longitude: sql`excluded.longitude`,
            address: sql`excluded.address`,
            locality: sql`excluded.locality`,
            region: sql`excluded.region`,
            postcode: sql`excluded.postcode`,
            countryCode: sql`excluded.country_code`,
            categoryId: sql`excluded.category_id`,
            categoryName: sql`excluded.category_name`,
            chainId: sql`excluded.chain_id`,
            chainName: sql`excluded.chain_name`,
            dateRefreshed: sql`excluded.date_refreshed`,
            h3Index: sql`excluded.h3_index`,
          },
        });

      return { processed: records.length, created: records.length, updated: 0 };
    } catch (error) {
      this.logError('Failed to import Foursquare batch', error);
      return { processed: 0, created: 0, updated: 0 };
    }
  }
}
