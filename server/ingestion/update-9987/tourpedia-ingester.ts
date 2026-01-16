/**
 * Update 9987 - TourPedia POI Ingester
 * Source: http://tour-pedia.org/api/getPlaces
 * Provides Points of Interest (POIs) for European cities
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { update9987TourpediaPois } from '@shared/schema';
import * as h3 from 'h3-js';

const BASE_URL = 'http://tour-pedia.org/api/getPlaces';

const LOCATIONS = ['Amsterdam', 'Barcelona', 'Berlin', 'Dubai', 'London', 'Paris', 'Rome', 'Florence'];
const CATEGORIES = ['accommodation', 'restaurant', 'poi', 'attraction'];

interface TourPediaPlace {
  id?: string;
  name?: string;
  type?: string;
  lat?: number;
  lng?: number;
  address?: string;
  [key: string]: unknown;
}

interface BatchResult {
  created: number;
  updated: number;
  errors: Array<{ message: string; data?: unknown }>;
}

export class TourpediaIngester extends BaseIngester {
  source: DataSource = {
    id: 'tourpedia-pois',
    name: 'TourPedia',
    displayName: 'TourPedia POIs',
    description: 'Points of Interest (POIs) for European cities from TourPedia API',
    type: 'api',
    baseUrl: BASE_URL,
    config: {
      enabled: true,
      cronSchedule: '0 2 * * 0', // Weekly on Sunday at 2am
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
      this.log('Starting TourPedia POI ingestion');
      this.log(`Fetching from ${LOCATIONS.length} locations and ${CATEGORIES.length} categories`);

      // Iterate through all location-category combinations
      for (const location of LOCATIONS) {
        for (const category of CATEGORIES) {
          try {
            const result = await this.fetchAndImportLocationCategory(location, category);
            totalCreated += result.created;
            totalUpdated += result.updated;
            totalProcessed += (result.created + result.updated);
            errors.push(...result.errors);

            // Log progress
            this.log(
              `Processed ${location} - ${category}: ${result.created} created, ${result.updated} updated`
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logError(
              `Failed to fetch ${location} - ${category}`,
              error
            );
            errors.push({
              message: `Failed to fetch ${location} - ${category}: ${errorMessage}`,
              data: { location, category },
            });
          }
        }
      }

      this.log('Ingestion completed successfully');

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
        message: error instanceof Error ? error.message : String(error),
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

  private async fetchAndImportLocationCategory(
    location: string,
    category: string
  ): Promise<BatchResult> {
    let created = 0;
    let updated = 0;
    const errors: Array<{ message: string; data?: unknown }> = [];

    try {
      // Fetch POIs from TourPedia API
      const url = `${BASE_URL}?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}`;
      this.log(`Fetching from: ${url}`);

      const response = await this.withRetry(
        () => fetch(url),
        `Fetch ${location} - ${category}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!this.validate(data)) {
        this.log(`No valid data returned for ${location} - ${category}`);
        return { created, updated, errors };
      }

      // Process places and insert into database
      const places = Array.isArray(data) ? data : [data];
      const batchSize = this.source.config.batchSize || 500;

      for (let i = 0; i < places.length; i += batchSize) {
        const batch = places.slice(i, i + batchSize);

        for (const place of batch) {
          try {
            if (!place.name || place.lat === undefined || place.lng === undefined) {
              errors.push({
                message: `Missing required fields (name, lat, lng)`,
                data: place,
              });
              continue;
            }

            // Compute H3 index at resolution 9
            const h3Index = h3.latLngToCell(place.lat, place.lng, 9);

            // Generate external ID from name and coordinates (if not provided)
            const externalId = place.id || `${place.name}-${place.lat.toFixed(6)}-${place.lng.toFixed(6)}`.replace(/\s+/g, '_');

            // Extract country code from location (simple mapping)
            const countryCode = this.getCountryCode(location);

            // Insert into database
            await db
              .insert(update9987TourpediaPois)
              .values({
                externalId,
                source: 'tourpedia',
                name: place.name,
                category: category,
                latitude: String(place.lat),
                longitude: String(place.lng),
                h3Index: h3Index,
                address: place.address || null,
                city: location,
                countryCode: countryCode,
                externalLinks: place.url ? { url: place.url } : null,
                rawData: place,
              })
              .onConflictDoNothing();

            created++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push({
              message: `Failed to insert place: ${errorMessage}`,
              data: { place, location, category },
            });
            updated++;
          }
        }

        this.log(
          `Imported batch for ${location} - ${category}: ${Math.min(batchSize, batch.length)} records`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        message: `Failed to process ${location} - ${category}: ${errorMessage}`,
        data: { location, category },
      });
    }

    return { created, updated, errors };
  }

  private getCountryCode(location: string): string {
    const countryMap: Record<string, string> = {
      Amsterdam: 'NL',
      Barcelona: 'ES',
      Berlin: 'DE',
      Dubai: 'AE',
      London: 'GB',
      Paris: 'FR',
      Rome: 'IT',
      Florence: 'IT',
    };

    return countryMap[location] || 'XX';
  }

  validate(data: unknown): boolean {
    if (!data) {
      return false;
    }

    // Accept both array of places or a single place object
    if (Array.isArray(data)) {
      return data.length > 0 && this.isValidPlace(data[0]);
    }

    return this.isValidPlace(data as TourPediaPlace);
  }

  private isValidPlace(place: unknown): boolean {
    if (typeof place !== 'object' || place === null) {
      return false;
    }

    const p = place as Partial<TourPediaPlace>;
    return Boolean(p.name && typeof p.lat === 'number' && typeof p.lng === 'number');
  }

  transform(data: unknown): unknown {
    return data;
  }
}
