/**
 * Update 9987 - Countries States Cities Ingester
 * Source: https://github.com/dr5hn/countries-states-cities-database
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { update9987Countries, update9987States, update9987Cities } from '@shared/schema';
import { sql } from 'drizzle-orm';

const BASE_URL = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json';

export class CountriesCitiesIngester extends BaseIngester {
  source: DataSource = {
    id: 'countries-states-cities',
    name: 'dr5hn Countries States Cities Database',
    displayName: 'Countries, States & Cities',
    description: 'Comprehensive geographical database with countries, states/regions, and cities worldwide',
    type: 'api',
    baseUrl: BASE_URL,
    config: {
      enabled: true,
      cronSchedule: '0 0 * * 0', // Weekly on Sunday
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
      this.log('Starting countries-states-cities ingestion');

      // Step 1: Fetch and import countries
      this.log('Fetching countries...');
      const countriesResponse = await this.withRetry(
        () => fetch(`${BASE_URL}/countries.json`),
        'Fetch countries'
      );
      const countries = await countriesResponse.json();
      this.log(`Fetched ${countries.length} countries`);

      const countryResult = await this.importCountries(countries);
      totalCreated += countryResult.created;
      totalUpdated += countryResult.updated;

      // Step 2: Fetch and import states
      this.log('Fetching states...');
      const statesResponse = await this.withRetry(
        () => fetch(`${BASE_URL}/states.json`),
        'Fetch states'
      );
      const states = await statesResponse.json();
      this.log(`Fetched ${states.length} states`);

      const stateResult = await this.importStates(states);
      totalCreated += stateResult.created;
      totalUpdated += stateResult.updated;

      // Step 3: Fetch and import cities
      this.log('Fetching cities...');
      const citiesResponse = await this.withRetry(
        () => fetch(`${BASE_URL}/cities.json`),
        'Fetch cities'
      );
      const cities = await citiesResponse.json();
      this.log(`Fetched ${cities.length} cities`);

      const cityResult = await this.importCities(cities);
      totalCreated += cityResult.created;
      totalUpdated += cityResult.updated;

      this.log('Ingestion completed successfully');

      return this.createResult({
        recordsProcessed: countries.length + states.length + cities.length,
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
        recordsProcessed: 0,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        errors,
        durationMs: Date.now() - startTime,
      });
    }
  }

  private async importCountries(countries: any[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const batchSize = this.source.config.batchSize || 1000;

    for (let i = 0; i < countries.length; i += batchSize) {
      const batch = countries.slice(i, i + batchSize);
      
      for (const country of batch) {
        try {
          const result = await db.insert(update9987Countries).values({
            name: country.name,
            iso2: country.iso2,
            iso3: country.iso3,
            numericCode: country.numeric_code,
            phoneCode: country.phone_code,
            capital: country.capital,
            currency: country.currency,
            currencyName: country.currency_name,
            currencySymbol: country.currency_symbol,
            tld: country.tld,
            native: country.native,
            region: country.region,
            subregion: country.subregion,
            timezones: country.timezones,
            latitude: country.latitude,
            longitude: country.longitude,
            emoji: country.emoji,
            emojiU: country.emojiU,
            sourceId: String(country.id),
            rawData: country,
          } as any).onConflictDoUpdate({
            target: update9987Countries.iso2,
            set: {
              name: sql`excluded.name`,
              iso3: sql`excluded.iso3`,
              capital: sql`excluded.capital`,
              currency: sql`excluded.currency`,
              currencyName: sql`excluded.currency_name`,
              currencySymbol: sql`excluded.currency_symbol`,
              region: sql`excluded.region`,
              subregion: sql`excluded.sub_region`,
              timezones: sql`excluded.timezones`,
              rawData: sql`excluded.raw_data`,
              updatedAt: sql`now()`,
            } as any,
          }).returning({ id: update9987Countries.id });
          
          if (result.length > 0) {
            created++;
          }
        } catch (error) {
          updated++;
        }
      }

      this.log(`Imported countries batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(countries.length / batchSize)}`);
    }

    return { created, updated };
  }

  private async importStates(states: any[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const batchSize = this.source.config.batchSize || 1000;

    for (let i = 0; i < states.length; i += batchSize) {
      const batch = states.slice(i, i + batchSize);
      
      for (const state of batch) {
        try {
          await db.insert(update9987States).values({
            name: state.name,
            countryCode: state.country_code,
            stateCode: state.state_code,
            type: state.type,
            latitude: state.latitude,
            longitude: state.longitude,
            sourceId: String(state.id),
            rawData: state,
          } as any).onConflictDoNothing();
          created++;
        } catch (error) {
          updated++;
        }
      }

      if (i % 5000 === 0 || i + batchSize >= states.length) {
        this.log(`Imported states batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(states.length / batchSize)}`);
      }
    }

    return { created, updated };
  }

  private async importCities(cities: any[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const batchSize = this.source.config.batchSize || 1000;

    for (let i = 0; i < cities.length; i += batchSize) {
      const batch = cities.slice(i, i + batchSize);
      
      for (const city of batch) {
        try {
          await db.insert(update9987Cities).values({
            name: city.name,
            stateCode: city.state_code,
            countryCode: city.country_code,
            latitude: city.latitude,
            longitude: city.longitude,
            wikiDataId: city.wikiDataId,
            sourceId: String(city.id),
            rawData: city,
          } as any).onConflictDoNothing();
          created++;
        } catch (error) {
          updated++;
        }
      }

      if (i % 10000 === 0 || i + batchSize >= cities.length) {
        this.log(`Imported cities batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cities.length / batchSize)}`);
      }
    }

    return { created, updated };
  }

  validate(data: unknown): boolean {
    return Array.isArray(data) && data.length > 0;
  }

  transform(data: unknown): unknown {
    return data;
  }
}
