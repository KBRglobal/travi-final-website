/**
 * Update 9987 - Overture Maps POI Ingester
 * Source: Overture Maps Foundation (Meta, Microsoft, Amazon, TomTom)
 * 
 * Overture Maps provides 64M+ POIs via S3 Parquet files.
 * API Documentation: https://docs.overturemaps.org/
 * 
 * PRODUCTION IMPLEMENTATION NOTES:
 * - Overture data is stored as Parquet files on S3: s3://overturemaps-us-west-2/release/
 * - Requires DuckDB with spatial extension to query efficiently:
 *   ```sql
 *   INSTALL spatial; LOAD spatial;
 *   SELECT * FROM read_parquet('s3://overturemaps-us-west-2/release/2024-10-23.0/theme=places/type=place/*')
 *   WHERE bbox.xmin >= -74.3 AND bbox.xmax <= -73.7 
 *     AND bbox.ymin >= 40.5 AND bbox.ymax <= 40.9
 *   LIMIT 1000;
 *   ```
 * - Alternative: Use Overture Maps CLI (overturemaps-py) for pre-filtered downloads
 * - This implementation currently generates placeholder POIs for priority cities
 *   to validate the schema and ingestion pipeline. Replace with DuckDB queries
 *   for production use.
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { update9987OverturePois, update9987Cities } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import * as h3 from 'h3-js';

const OVERTURE_PLACES_BASE = 'https://overturemaps-us-west-2.s3.amazonaws.com';

interface OvertureBBox {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  countryCode: string;
}

const PRIORITY_CITIES: OvertureBBox[] = [
  { name: 'Dubai', minLat: 24.8, maxLat: 25.4, minLng: 54.9, maxLng: 55.6, countryCode: 'AE' },
  { name: 'Abu Dhabi', minLat: 24.3, maxLat: 24.7, minLng: 54.2, maxLng: 54.8, countryCode: 'AE' },
  { name: 'London', minLat: 51.3, maxLat: 51.7, minLng: -0.5, maxLng: 0.3, countryCode: 'GB' },
  { name: 'Paris', minLat: 48.7, maxLat: 49.0, minLng: 2.2, maxLng: 2.5, countryCode: 'FR' },
  { name: 'New York', minLat: 40.5, maxLat: 40.9, minLng: -74.3, maxLng: -73.7, countryCode: 'US' },
  { name: 'Tokyo', minLat: 35.5, maxLat: 35.9, minLng: 139.5, maxLng: 140.0, countryCode: 'JP' },
  { name: 'Singapore', minLat: 1.2, maxLat: 1.5, minLng: 103.6, maxLng: 104.0, countryCode: 'SG' },
  { name: 'Barcelona', minLat: 41.3, maxLat: 41.5, minLng: 2.0, maxLng: 2.3, countryCode: 'ES' },
  { name: 'Rome', minLat: 41.8, maxLat: 42.0, minLng: 12.3, maxLng: 12.6, countryCode: 'IT' },
  { name: 'Amsterdam', minLat: 52.3, maxLat: 52.5, minLng: 4.7, maxLng: 5.0, countryCode: 'NL' },
  { name: 'Bangkok', minLat: 13.6, maxLat: 13.9, minLng: 100.4, maxLng: 100.7, countryCode: 'TH' },
  { name: 'Istanbul', minLat: 40.9, maxLat: 41.2, minLng: 28.8, maxLng: 29.2, countryCode: 'TR' },
  { name: 'Hong Kong', minLat: 22.15, maxLat: 22.55, minLng: 113.8, maxLng: 114.4, countryCode: 'HK' },
  { name: 'Miami', minLat: 25.7, maxLat: 25.9, minLng: -80.3, maxLng: -80.1, countryCode: 'US' },
  { name: 'Las Vegas', minLat: 36.0, maxLat: 36.3, minLng: -115.3, maxLng: -115.0, countryCode: 'US' },
  { name: 'Los Angeles', minLat: 33.7, maxLat: 34.4, minLng: -118.7, maxLng: -117.8, countryCode: 'US' },
];

export class OvertureIngester extends BaseIngester {
  source: DataSource = {
    id: 'overture-maps',
    name: 'Overture Maps Foundation Places',
    displayName: 'Overture Maps POIs',
    description: 'High-quality POI data from Meta, Microsoft, Amazon, TomTom (64M+ places). NOTE: Currently using placeholder data - requires DuckDB for production.',
    type: 'api',
    baseUrl: OVERTURE_PLACES_BASE,
    config: {
      enabled: false, // Disabled until DuckDB is configured for production
      cronSchedule: '0 1 * * 0', // Weekly Sunday 1am
      batchSize: 500,
      retryAttempts: 3,
    },
  };

  async ingest(): Promise<IngestionResult> {
    const startTime = Date.now();
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalProcessed = 0;
    const errors: Array<{ message: string; data?: unknown }> = [];

    try {
      this.log('Starting Overture Maps POI ingestion');
      this.log(`Processing ${PRIORITY_CITIES.length} priority cities`);

      for (const city of PRIORITY_CITIES) {
        try {
          this.log(`Processing city: ${city.name}`);
          const result = await this.ingestCity(city);
          totalCreated += result.created;
          totalUpdated += result.updated;
          totalProcessed += result.processed;
          this.log(`${city.name}: ${result.created} created, ${result.updated} updated from ${result.processed} processed`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logError(`Failed to process ${city.name}`, error);
          errors.push({ message: `${city.name}: ${message}`, data: { city: city.name } });
        }
      }

      this.log(`Ingestion completed: ${totalCreated} created, ${totalUpdated} updated from ${totalProcessed} total`);

      return this.createResult({
        recordsProcessed: totalProcessed,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        errors,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      this.logError('Ingestion failed', error);
      errors.push({ 
        message: error instanceof Error ? error.message : String(error) 
      });
      
      return this.createResult({
        recordsProcessed: totalProcessed,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        errors,
        durationMs: Date.now() - startTime,
      });
    }
  }

  private async ingestCity(city: OvertureBBox): Promise<{ created: number; updated: number; processed: number }> {
    let created = 0;
    let updated = 0;
    let processed = 0;

    // Use Overture Maps API via HTTP (simplified for demo - full implementation would use DuckDB)
    // For production, use: DuckDB with: SELECT * FROM read_parquet('s3://...')
    // WHERE bbox.xmin >= {minLng} AND bbox.xmax <= {maxLng} AND bbox.ymin >= {minLat} AND bbox.ymax <= {maxLat}
    
    // Generate sample POIs for the city based on its bounding box
    // In production, this would query the actual Overture Maps parquet files
    const samplePois = this.generateSamplePois(city, 50);
    
    for (const poi of samplePois) {
      try {
        const h3Index = this.computeH3Index(poi.latitude, poi.longitude);
        
        await db.insert(update9987OverturePois).values({
          overtureId: poi.id,
          name: poi.name,
          category: poi.category,
          subcategory: poi.subcategory,
          confidence: poi.confidence,
          latitude: poi.latitude,
          longitude: poi.longitude,
          h3Index,
          address: poi.address,
          phones: poi.phones,
          websites: poi.websites,
          brands: poi.brands,
          countryCode: city.countryCode,
          cityName: city.name,
          rawData: poi,
        }).onConflictDoUpdate({
          target: update9987OverturePois.overtureId,
          set: {
            name: sql`excluded.name`,
            category: sql`excluded.category`,
            subcategory: sql`excluded.subcategory`,
            confidence: sql`excluded.confidence`,
            h3Index: sql`excluded.h3_index`,
            address: sql`excluded.address`,
            phones: sql`excluded.phones`,
            websites: sql`excluded.websites`,
            brands: sql`excluded.brands`,
            rawData: sql`excluded.raw_data`,
            updatedAt: sql`now()`,
          },
        });
        
        created++;
        processed++;
      } catch (error) {
        updated++;
        processed++;
      }
    }

    return { created, updated, processed };
  }

  private generateSamplePois(city: OvertureBBox, count: number): any[] {
    // Generate sample POIs within the city bounds
    // In production, this would be replaced with actual Overture Maps API data
    const categories = [
      { main: 'eat_and_drink', sub: 'restaurant' },
      { main: 'eat_and_drink', sub: 'cafe' },
      { main: 'eat_and_drink', sub: 'bar' },
      { main: 'accommodation', sub: 'hotel' },
      { main: 'attractions_and_activities', sub: 'museum' },
      { main: 'attractions_and_activities', sub: 'landmark' },
      { main: 'retail', sub: 'shopping_mall' },
      { main: 'retail', sub: 'store' },
      { main: 'professional_services', sub: 'bank' },
      { main: 'travel', sub: 'airport' },
    ];

    const pois = [];
    for (let i = 0; i < count; i++) {
      const cat = categories[i % categories.length];
      const lat = city.minLat + Math.random() * (city.maxLat - city.minLat);
      const lng = city.minLng + Math.random() * (city.maxLng - city.minLng);
      
      pois.push({
        id: `overture_${city.name.toLowerCase().replace(/\s/g, '_')}_${i}_${Date.now()}`,
        name: `${cat.sub.replace(/_/g, ' ')} in ${city.name} ${i + 1}`,
        category: cat.main,
        subcategory: cat.sub,
        confidence: (0.7 + Math.random() * 0.3).toFixed(2),
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        address: {
          freeform: `${Math.floor(Math.random() * 999) + 1} Sample Street, ${city.name}`,
          country: city.countryCode,
        },
        phones: null,
        websites: null,
        brands: null,
      });
    }
    
    return pois;
  }

  private computeH3Index(lat: string | null, lng: string | null): string | null {
    if (!lat || !lng) return null;
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) return null;
    if (latitude < -90 || latitude > 90) return null;
    if (longitude < -180 || longitude > 180) return null;
    
    try {
      return h3.latLngToCell(latitude, longitude, 9);
    } catch {
      return null;
    }
  }

  validate(data: unknown): boolean {
    return Array.isArray(data) && data.length > 0;
  }

  transform(data: unknown): unknown {
    return data;
  }
}
