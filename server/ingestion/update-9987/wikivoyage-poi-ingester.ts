/**
 * Update 9987 - Wikivoyage POI Ingester
 * Source: https://github.com/baturin/wikivoyage-listings
 * Data: 313K+ POIs with addresses, phones, hours, and coordinates
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { update9987WikivoyagePois, insertUpdate9987WikivoyagePoiSchema } from '@shared/schema';
import { sql } from 'drizzle-orm';
import * as h3 from 'h3-js';

const CSV_URL = 'https://raw.githubusercontent.com/baturin/wikivoyage-listings/master/listings.csv';

export class WikivoyagePoiIngester extends BaseIngester {
  source: DataSource = {
    id: 'wikivoyage-pois',
    name: 'Wikivoyage POI Listings',
    displayName: 'Wikivoyage Points of Interest',
    description: 'Crowdsourced POI data from Wikivoyage with addresses, phones, hours, and coordinates',
    type: 'api',
    baseUrl: CSV_URL,
    config: {
      enabled: true,
      cronSchedule: '0 4 * * 0', // Weekly Sunday 4am
      batchSize: 1000,
      retryAttempts: 3,
    },
  };

  async ingest(): Promise<IngestionResult> {
    const startTime = Date.now();
    let totalCreated = 0;
    let totalUpdated = 0;
    const errors: Array<{ message: string; data?: unknown }> = [];

    try {
      this.log('Starting Wikivoyage POI ingestion');

      // Step 1: Fetch CSV
      this.log('Fetching CSV from GitHub...');
      const csvResponse = await this.withRetry(
        () => fetch(CSV_URL),
        'Fetch CSV'
      );
      const csvText = await csvResponse.text();
      this.log(`Fetched CSV (${csvText.length} bytes)`);

      // Step 2: Parse CSV
      this.log('Parsing CSV...');
      const records = this.parseCSV(csvText);
      this.log(`Parsed ${records.length} records from CSV`);

      // Step 3: Transform and validate records
      this.log('Transforming and validating records...');
      const validRecords = records
        .map((record, index) => this.transformRecord(record, index))
        .filter((record): record is ReturnType<typeof this.transformRecord> => record !== null);
      
      this.log(`Valid records after transformation: ${validRecords.length}`);

      // Step 4: Import to database
      const result = await this.importPois(validRecords);
      totalCreated = result.created;
      totalUpdated = result.updated;

      this.log('Ingestion completed successfully');

      return this.createResult({
        recordsProcessed: records.length,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        errors,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      this.logError('Ingestion failed', error);
      errors.push({
        message: error instanceof Error ? error.message : String(error),
      });

      return this.createResult({
        recordsProcessed: 0,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        errors,
        durationMs: Date.now() - startTime,
      });
    }
  }

  /**
   * Parse CSV with proper quote handling
   */
  private parseCSV(csvText: string): Array<Record<string, string>> {
    const lines = csvText.split('\n');
    
    if (lines.length < 2) {
      this.log('CSV has no data rows');
      return [];
    }

    // Parse header
    const headers = this.parseCSVLine(lines[0]);
    const records: Array<Record<string, string>> = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = this.parseCSVLine(line);
      
      // Create record object
      const record: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = values[j] || '';
      }

      records.push(record);
    }

    return records;
  }

  /**
   * Parse a single CSV line with quote handling
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());

    return result;
  }

  /**
   * Transform CSV record to database record
   */
  private transformRecord(
    record: Record<string, string>,
    index: number
  ): {
    articleName?: string;
    listingType?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    hours?: string;
    price?: string;
    latitude?: string;
    longitude?: string;
    h3Index?: string;
    description?: string;
    rawData: Record<string, string>;
  } | null {
    try {
      const name = record.name?.trim();
      if (!name) {
        this.logError(`Record ${index} missing required 'name' field`, record);
        return null;
      }

      // Parse coordinates
      const lat = this.parseNumber(record.lat);
      const lng = this.parseNumber(record.long);

      // Compute H3 index if coordinates are valid
      let h3Index: string | undefined;
      if (lat !== null && lng !== null && this.isValidCoordinate(lat, lng)) {
        try {
          h3Index = h3.latLngToCell(lat, lng, 9);
        } catch (error) {
          this.logError(`Failed to compute H3 index for record ${index}`, { lat, lng, error });
        }
      }

      return {
        articleName: record.article?.trim() || undefined,
        listingType: record.type?.trim() || undefined,
        name,
        address: record.address?.trim() || undefined,
        phone: record.phone?.trim() || undefined,
        email: record.email?.trim() || undefined,
        website: record.url?.trim() || undefined,
        hours: record.hours?.trim() || undefined,
        price: record.price?.trim() || undefined,
        latitude: record.lat?.trim() || undefined,
        longitude: record.long?.trim() || undefined,
        h3Index,
        description: record.content?.trim() || undefined,
        rawData: record,
      };
    } catch (error) {
      this.logError(`Failed to transform record ${index}`, { record, error });
      return null;
    }
  }

  /**
   * Parse number from string
   */
  private parseNumber(value?: string): number | null {
    if (!value) return null;
    const num = parseFloat(value.trim());
    return isNaN(num) ? null : num;
  }

  /**
   * Validate latitude/longitude coordinates
   */
  private isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Import POIs to database
   */
  private async importPois(
    pois: Array<Record<string, any>>
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const batchSize = this.source.config.batchSize || 1000;

    for (let i = 0; i < pois.length; i += batchSize) {
      const batch = pois.slice(i, i + batchSize);

      for (const poi of batch) {
        try {
          // Validate using the insert schema
          const validated = insertUpdate9987WikivoyagePoiSchema.parse({
            articleName: poi.articleName,
            listingType: poi.listingType,
            name: poi.name,
            address: poi.address,
            phone: poi.phone,
            email: poi.email,
            website: poi.website,
            hours: poi.hours,
            price: poi.price,
            latitude: poi.latitude,
            longitude: poi.longitude,
            h3Index: poi.h3Index,
            description: poi.description,
            rawData: poi.rawData,
          });

          // Try to insert or update
          await db
            .insert(update9987WikivoyagePois)
            .values(validated)
            .onConflictDoNothing();

          created++;
        } catch (error) {
          updated++;
          this.logError('Failed to insert POI record', { poi, error });
        }
      }

      if (i % 5000 === 0 || i + batchSize >= pois.length) {
        this.log(
          `Imported POI batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pois.length / batchSize)}`
        );
      }
    }

    return { created, updated };
  }

  validate(data: unknown): boolean {
    return typeof data === 'string' && data.length > 0;
  }

  transform(data: unknown): unknown {
    return data;
  }
}
