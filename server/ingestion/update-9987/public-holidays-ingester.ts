/**
 * Public Holidays Ingester
 * Fetches public holidays from Nager.Date API (free, no API key required)
 * Source: https://date.nager.at/api/v3/publicholidays/{year}/{countryCode}
 * 
 * Supports 100+ countries with official holiday data including:
 * - Holiday name (local and English)
 * - Date and whether it's fixed annually
 * - Whether it applies globally or to specific regions
 * - Holiday types (Public, Bank, School, Authorities, Optional, Observance)
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { update9987PublicHolidays } from '@shared/schema';
import { sql } from 'drizzle-orm';

const NAGER_DATE_BASE_URL = 'https://date.nager.at/api/v3';

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

const WHITELISTED_COUNTRY_CODES = [
  'AE', // UAE (Dubai, Abu Dhabi)
  'NL', // Netherlands (Amsterdam)
  'TH', // Thailand (Bangkok)
  'ES', // Spain (Barcelona)
  'HK', // Hong Kong
  'TR', // Turkey (Istanbul)
  'US', // USA (Las Vegas, Los Angeles, Miami, New York)
  'GB', // UK (London)
  'FR', // France (Paris)
  'IT', // Italy (Rome)
  'SG', // Singapore
  'JP', // Japan (Tokyo)
  'DE', // Germany
  'AU', // Australia
  'CA', // Canada
  'CH', // Switzerland
  'AT', // Austria
  'BE', // Belgium
  'BR', // Brazil
  'CN', // China
  'IN', // India
  'MX', // Mexico
  'NZ', // New Zealand
  'PL', // Poland
  'PT', // Portugal
  'SE', // Sweden
  'NO', // Norway
  'DK', // Denmark
  'FI', // Finland
  'IE', // Ireland
  'ZA', // South Africa
  'KR', // South Korea
  'SA', // Saudi Arabia
  'QA', // Qatar
  'IL', // Israel
  'EG', // Egypt
  'GR', // Greece
  'CZ', // Czech Republic
  'HU', // Hungary
  'RU', // Russia
  'MY', // Malaysia
  'ID', // Indonesia
  'PH', // Philippines
  'VN', // Vietnam
  'AR', // Argentina
  'CL', // Chile
  'CO', // Colombia
  'PE', // Peru
];

export class PublicHolidaysIngester extends BaseIngester {
  validate(): boolean { return true; }
  transform(data: unknown): unknown { return data; }
  
  source: DataSource = {
    id: 'public-holidays',
    name: 'Public Holidays (Nager.Date)',
    displayName: 'Public Holidays',
    description: 'Official public holidays from Nager.Date API - 100+ countries, free',
    type: 'api',
    baseUrl: NAGER_DATE_BASE_URL,
    config: {
      enabled: true,
      cronSchedule: '0 0 1 * *', // Monthly on the 1st (holidays don't change often)
      batchSize: 50,
      retryAttempts: 3,
    },
  };

  async ingest(): Promise<IngestionResult> {
    const startTime = Date.now();
    this.log('Starting public holidays ingestion from Nager.Date');

    const errors: { message: string; recordId?: string }[] = [];
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;

    try {
      const currentYear = new Date().getFullYear();
      const yearsToFetch = [currentYear, currentYear + 1]; // Current and next year

      for (const countryCode of WHITELISTED_COUNTRY_CODES) {
        for (const year of yearsToFetch) {
          try {
            const result = await this.fetchHolidaysForCountry(countryCode, year);
            
            totalProcessed += result.processed;
            totalCreated += result.created;
            totalUpdated += result.updated;
            
            if (result.processed > 0) {
              this.log(`Fetched ${result.processed} holidays for ${countryCode} ${year}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push({ message: `${countryCode} ${year}: ${message}` });
            this.log(`Failed to fetch holidays for ${countryCode} ${year}: ${message}`);
          }

          // Rate limiting - 200ms between requests
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      const result = this.createResult({
        recordsProcessed: totalProcessed,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        durationMs: Date.now() - startTime,
        errors,
      });

      this.log('Public holidays ingestion completed', result);
      return result;
    } catch (error) {
      this.logError('Public holidays ingestion failed', error);
      
      return this.createResult({
        durationMs: Date.now() - startTime,
        errors: [{
          message: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  private async fetchHolidaysForCountry(
    countryCode: string,
    year: number
  ): Promise<{ processed: number; created: number; updated: number }> {
    const url = `${NAGER_DATE_BASE_URL}/PublicHolidays/${year}/${countryCode}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TRAVI-CMS/1.0 (Travel Holidays Service)',
      },
    });

    if (response.status === 404) {
      // Country not supported by Nager.Date
      return { processed: 0, created: 0, updated: 0 };
    }

    if (!response.ok) {
      throw new Error(`Nager.Date API returned ${response.status}`);
    }

    const holidays: NagerHoliday[] = await response.json();
    
    if (!Array.isArray(holidays) || holidays.length === 0) {
      return { processed: 0, created: 0, updated: 0 };
    }

    let created = 0;
    let updated = 0;

    for (const holiday of holidays) {
      try {
        // Check if holiday already exists
        const existing = await db
          .select({ id: update9987PublicHolidays.id })
          .from(update9987PublicHolidays)
          .where(
            sql`country_code = ${holiday.countryCode} 
                AND date = ${holiday.date} 
                AND name = ${holiday.name}`
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing record
          await db
            .update(update9987PublicHolidays)
            .set({
              localName: holiday.localName,
              fixed: holiday.fixed,
              global: holiday.global,
              counties: holiday.counties,
              launchYear: holiday.launchYear,
              types: holiday.types,
              updatedAt: new Date(),
            } as any)
            .where(sql`id = ${existing[0].id}`);
          updated++;
        } else {
          // Insert new record
          await db
            .insert(update9987PublicHolidays)
            .values({
              countryCode: holiday.countryCode,
              date: holiday.date,
              year: year,
              localName: holiday.localName,
              name: holiday.name,
              fixed: holiday.fixed,
              global: holiday.global,
              counties: holiday.counties,
              launchYear: holiday.launchYear,
              types: holiday.types,
            } as any);
          created++;
        }
      } catch (error) {
        this.logError(`Failed to save holiday: ${holiday.name}`, error);
      }
    }

    return {
      processed: holidays.length,
      created,
      updated: holidays.length - created,
    };
  }
}
