/**
 * Update 9987 - GeoNames Ingester
 * Source: https://download.geonames.org/export/dump/cities15000.txt
 * 
 * GeoNames provides geographic location data for 15,000+ cities and towns worldwide
 * TSV format with 19 columns (tab-separated, no header)
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { update9987Geonames } from '@shared/schema';
import * as h3 from 'h3-js';

const GEONAMES_URL = 'http://download.geonames.org/export/dump/cities15000.txt';

export class GeonamesIngester extends BaseIngester {
  source: DataSource = {
    id: 'geonames',
    name: 'GeoNames Cities',
    displayName: 'GeoNames',
    description: 'Geographic location data for 15,000+ cities and towns worldwide',
    type: 'api',
    baseUrl: GEONAMES_URL,
    config: {
      enabled: true,
      cronSchedule: '0 3 * * 0', // Weekly on Sunday at 3am
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
      this.log('Starting GeoNames ingestion');

      // Fetch TSV data from GeoNames
      const response = await this.withRetry(
        () => fetch(GEONAMES_URL),
        'Fetch GeoNames data'
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const lines = text.trim().split('\n');
      this.log(`Fetched ${lines.length} records from GeoNames`);

      // Parse and import in batches
      const batchSize = this.source.config.batchSize || 1000;
      for (let i = 0; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize);
        const records = this.parseLines(batch, errors);
        
        if (records.length > 0) {
          const result = await this.importGeonames(records);
          totalCreated += result.created;
          totalUpdated += result.updated;
          recordsProcessed += result.processed;
        }

        this.log(
          `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lines.length / batchSize)}`
        );
      }

      this.log('GeoNames ingestion completed successfully');

      return this.createResult({
        recordsProcessed,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        errors,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      this.logError('GeoNames ingestion failed', error);
      errors.push({ 
        message: error instanceof Error ? error.message : String(error) 
      });
      
      return this.createResult({
        recordsProcessed,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        errors,
        durationMs: Date.now() - startTime,
      });
    }
  }

  /**
   * Parse TSV lines into structured records
   * TSV columns: geonameid, name, asciiname, alternatenames, latitude, longitude, 
   *              feature_class, feature_code, country_code, cc2, admin1_code, 
   *              admin2_code, admin3_code, admin4_code, population, elevation, dem, 
   *              timezone, modification_date
   */
  private parseLines(lines: string[], errors: Array<{ message: string; data?: unknown }>): Array<{
    geonameId: number;
    name: string;
    asciiName: string;
    alternateNames: string;
    latitude: string;
    longitude: string;
    featureClass: string;
    featureCode: string;
    countryCode: string;
    adminCode1: string;
    adminCode2: string;
    population: number;
    elevation: number;
    timezone: string;
    modificationDate: string;
    h3Index: string;
  }> {
    const records = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const columns = line.split('\t');
        
        // Map columns to fields
        const geonameId = parseInt(columns[0], 10);
        const latitude = parseFloat(columns[4]);
        const longitude = parseFloat(columns[5]);

        // Validate required fields
        if (!geonameId || !columns[1] || isNaN(latitude) || isNaN(longitude)) {
          errors.push({
            message: 'Invalid record: missing required fields',
            data: { line },
          });
          continue;
        }

        // Compute H3 index at resolution 9
        let h3Index = '';
        try {
          h3Index = h3.latLngToCell(latitude, longitude, 9);
        } catch (h3Error) {
          this.logError('H3 computation failed for record', { geonameId, latitude, longitude, h3Error });
          errors.push({
            message: 'H3 index computation failed',
            data: { geonameId },
          });
          continue;
        }

        // Parse numeric fields with defaults
        const population = columns[14] ? parseInt(columns[14], 10) : 0;
        const elevation = columns[15] ? parseInt(columns[15], 10) : 0;

        records.push({
          geonameId,
          name: columns[1],
          asciiName: columns[2],
          alternateNames: columns[3],
          latitude: columns[4],
          longitude: columns[5],
          featureClass: columns[6],
          featureCode: columns[7],
          countryCode: columns[8],
          adminCode1: columns[10],
          adminCode2: columns[11],
          population,
          elevation,
          timezone: columns[17],
          modificationDate: columns[18],
          h3Index,
        });
      } catch (error) {
        errors.push({
          message: `Failed to parse line: ${error instanceof Error ? error.message : String(error)}`,
          data: { line },
        });
      }
    }

    return records;
  }

  /**
   * Import parsed geonames records into the database
   */
  private async importGeonames(records: any[]): Promise<{ created: number; updated: number; processed: number }> {
    let created = 0;
    let updated = 0;

    for (const record of records) {
      try {
        await db.insert(update9987Geonames).values({
          geonameId: record.geonameId,
          name: record.name,
          asciiName: record.asciiName,
          alternateNames: record.alternateNames,
          latitude: record.latitude,
          longitude: record.longitude,
          featureClass: record.featureClass,
          featureCode: record.featureCode,
          countryCode: record.countryCode,
          adminCode1: record.adminCode1,
          adminCode2: record.adminCode2,
          population: record.population,
          elevation: record.elevation,
          timezone: record.timezone,
          modificationDate: record.modificationDate,
          h3Index: record.h3Index,
        }).onConflictDoNothing();
        
        created++;
      } catch (error) {
        // Record already exists or other database error
        if ((error as any)?.code === '23505') {
          // Unique constraint violation
          updated++;
        } else {
          this.logError('Failed to insert geoname record', { 
            geonameId: record.geonameId, 
            error 
          });
        }
      }
    }

    return { created, updated, processed: records.length };
  }

  validate(data: unknown): boolean {
    // Validate that we have an array of strings (lines of TSV data)
    return Array.isArray(data) && data.length > 0;
  }

  transform(data: unknown): unknown {
    // Raw lines are already in the right format for parsing
    return data;
  }
}
