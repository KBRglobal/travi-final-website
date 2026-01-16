/**
 * Update 9987 - SLIPO OSM POI Ingester
 * Source: https://download.slipo.eu/results/osm-to-csv/
 * 
 * SLIPO provides 18.5M+ POIs extracted from OpenStreetMap in CSV format.
 * Data is organized by country/continent with monthly updates.
 * 
 * CSV columns vary by file but typically include:
 * - osm_id, osm_type (node/way/relation)
 * - name, category, subcategory
 * - street, house_number, city, postcode, country
 * - phone, website, email, opening_hours
 * - lat, lon
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { update9987SlipoPois } from '@shared/schema';
import { sql } from 'drizzle-orm';
import * as h3 from 'h3-js';

// Priority cities for ingestion (matching Tiqets whitelisted cities)
const PRIORITY_CITIES = [
  { name: 'dubai', country: 'ae' },
  { name: 'abu-dhabi', country: 'ae' },
  { name: 'london', country: 'gb' },
  { name: 'paris', country: 'fr' },
  { name: 'barcelona', country: 'es' },
  { name: 'rome', country: 'it' },
  { name: 'amsterdam', country: 'nl' },
  { name: 'tokyo', country: 'jp' },
  { name: 'singapore', country: 'sg' },
  { name: 'bangkok', country: 'th' },
  { name: 'hong-kong', country: 'hk' },
  { name: 'istanbul', country: 'tr' },
  { name: 'las-vegas', country: 'us' },
  { name: 'los-angeles', country: 'us' },
  { name: 'miami', country: 'us' },
  { name: 'new-york', country: 'us' },
];

// SLIPO CSV URL pattern - organized by country code
const SLIPO_BASE_URL = 'https://download.slipo.eu/results/osm-to-csv';

export class SlipoIngester extends BaseIngester {
  source: DataSource = {
    id: 'slipo',
    name: 'SLIPO OSM POIs',
    displayName: 'SLIPO',
    description: '18.5M+ POIs from OpenStreetMap extracted to CSV format',
    type: 'file',
    baseUrl: SLIPO_BASE_URL,
    config: {
      enabled: true,
      cronSchedule: '0 4 * * 0', // Weekly on Sunday at 4am
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
      this.log('Starting SLIPO OSM POI ingestion');

      // Process each priority country
      const countryGroups = this.groupCitiesByCountry();
      
      for (const [countryCode, cities] of Object.entries(countryGroups)) {
        try {
          const result = await this.processCountry(countryCode, cities);
          totalCreated += result.created;
          totalUpdated += result.updated;
          recordsProcessed += result.processed;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ message: `Failed to process country ${countryCode}: ${message}` });
          this.logError(`Failed to process country ${countryCode}`, error);
        }
      }

      this.log('SLIPO ingestion completed successfully');

      return this.createResult({
        recordsProcessed,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        errors,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      this.logError('SLIPO ingestion failed', error);
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

  private groupCitiesByCountry(): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const city of PRIORITY_CITIES) {
      if (!groups[city.country]) {
        groups[city.country] = [];
      }
      groups[city.country].push(city.name);
    }
    return groups;
  }

  private async processCountry(
    countryCode: string,
    cities: string[]
  ): Promise<{ processed: number; created: number; updated: number }> {
    this.log(`Processing SLIPO data for country: ${countryCode.toUpperCase()}`);

    // Try multiple URL patterns for SLIPO CSV data
    const urlPatterns = [
      `${SLIPO_BASE_URL}/${countryCode.toUpperCase()}/${countryCode.toUpperCase()}_pois.csv`,
      `${SLIPO_BASE_URL}/${countryCode.toLowerCase()}/${countryCode.toLowerCase()}_pois.csv`,
      `${SLIPO_BASE_URL}/world/${countryCode.toUpperCase()}_pois.csv`,
    ];
    
    let text: string | null = null;
    
    for (const csvUrl of urlPatterns) {
      try {
        this.log(`Trying SLIPO URL: ${csvUrl}`);
        const response = await fetch(csvUrl, {
          headers: { 'User-Agent': 'TRAVI-CMS/1.0' },
        });

        if (response.ok) {
          text = await response.text();
          this.log(`Successfully fetched SLIPO data from ${csvUrl}`);
          break;
        } else {
          this.log(`URL returned ${response.status}: ${csvUrl}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.log(`Failed to fetch ${csvUrl}: ${message}`);
      }
    }

    if (!text) {
      this.log(`No SLIPO data available for ${countryCode}, continuing with next country...`);
      return { processed: 0, created: 0, updated: 0 };
    }

    // Parse CSV
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      return { processed: 0, created: 0, updated: 0 };
    }

    // First line is header
    const headers = this.parseCSVLine(lines[0]);
    const headerMap = this.createHeaderMap(headers);

    let processed = 0;
    let created = 0;
    let updated = 0;

    // Process in batches
    const batchSize = this.source.config.batchSize || 1000;
    const records: Array<typeof update9987SlipoPois.$inferInsert> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length < 3) continue;

      const record = this.parseRecord(values, headerMap, countryCode);
      if (record) {
        records.push(record);
      }

      // Import batch when full
      if (records.length >= batchSize) {
        const result = await this.importBatch(records);
        created += result.created;
        updated += result.updated;
        processed += result.processed;
        records.length = 0;
        
        this.log(`Processed ${processed} records for ${countryCode}`);
      }
    }

    // Import remaining records
    if (records.length > 0) {
      const result = await this.importBatch(records);
      created += result.created;
      updated += result.updated;
      processed += result.processed;
    }

    this.log(`Completed ${countryCode}: ${processed} processed, ${created} created, ${updated} updated`);
    return { processed, created, updated };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private createHeaderMap(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    headers.forEach((h, i) => {
      map[h.toLowerCase().replace(/[^a-z0-9]/g, '_')] = i;
    });
    return map;
  }

  private parseRecord(
    values: string[],
    headerMap: Record<string, number>,
    countryCode: string
  ): typeof update9987SlipoPois.$inferInsert | null {
    const get = (key: string): string | undefined => {
      const idx = headerMap[key];
      return idx !== undefined ? values[idx] : undefined;
    };

    const osmId = get('osm_id') || get('id');
    if (!osmId) return null;

    const lat = get('lat') || get('latitude');
    const lon = get('lon') || get('longitude');
    
    // Calculate H3 index if coordinates available
    let h3Index: string | undefined;
    if (lat && lon) {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (!isNaN(latNum) && !isNaN(lonNum)) {
        try {
          h3Index = h3.latLngToCell(latNum, lonNum, 9);
        } catch {
          // Invalid coordinates
        }
      }
    }

    return {
      osmId,
      osmType: get('osm_type') || 'node',
      name: get('name'),
      category: get('category') || get('amenity') || get('tourism'),
      subcategory: get('subcategory'),
      street: get('street') || get('addr_street'),
      houseNumber: get('house_number') || get('addr_housenumber'),
      city: get('city') || get('addr_city'),
      postcode: get('postcode') || get('addr_postcode'),
      countryCode: countryCode.toUpperCase(),
      phone: get('phone'),
      website: get('website'),
      email: get('email'),
      openingHours: get('opening_hours'),
      cuisine: get('cuisine'),
      latitude: lat,
      longitude: lon,
      h3Index,
    };
  }

  private async importBatch(
    records: Array<typeof update9987SlipoPois.$inferInsert>
  ): Promise<{ processed: number; created: number; updated: number }> {
    if (records.length === 0) {
      return { processed: 0, created: 0, updated: 0 };
    }

    try {
      // Upsert with conflict handling on osm_id + osm_type
      await db
        .insert(update9987SlipoPois)
        .values(records)
        .onConflictDoUpdate({
          target: [update9987SlipoPois.osmId, update9987SlipoPois.osmType],
          set: {
            name: sql`excluded.name`,
            category: sql`excluded.category`,
            subcategory: sql`excluded.subcategory`,
            street: sql`excluded.street`,
            houseNumber: sql`excluded.house_number`,
            city: sql`excluded.city`,
            postcode: sql`excluded.postcode`,
            phone: sql`excluded.phone`,
            website: sql`excluded.website`,
            email: sql`excluded.email`,
            openingHours: sql`excluded.opening_hours`,
            cuisine: sql`excluded.cuisine`,
            latitude: sql`excluded.latitude`,
            longitude: sql`excluded.longitude`,
            h3Index: sql`excluded.h3_index`,
          },
        });

      // Approximate: assume all new if no errors
      return { processed: records.length, created: records.length, updated: 0 };
    } catch (error) {
      this.logError('Failed to import SLIPO batch', error);
      return { processed: 0, created: 0, updated: 0 };
    }
  }
}
