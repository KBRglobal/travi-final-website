/**
 * Visa Requirements Ingester
 * Fetches visa requirements data from Passport Index GitHub CSV dataset
 * Source: https://github.com/ilyankou/passport-index-dataset
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { visaRequirements } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface VisaRecord {
  passportCountryCode: string;
  destinationCountryCode: string;
  visaCategory: string;
  stayDuration: number | null;
  notes: string | null;
}

const CSV_URL = 'https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-matrix-iso2.csv';
const SOURCE_URL = 'https://github.com/ilyankou/passport-index-dataset';

export class VisaRequirementsIngester extends BaseIngester {
  source: DataSource = {
    id: 'visa-requirements',
    name: 'Visa Requirements Feed',
    displayName: 'Visa Requirements',
    description: 'Global visa requirements from Passport Index dataset',
    type: 'feed',
    baseUrl: CSV_URL,
    config: {
      enabled: true,
      cronSchedule: '0 3 * * *',
      batchSize: 500,
      retryAttempts: 3,
    },
  };

  async ingest(): Promise<IngestionResult> {
    const startTime = Date.now();
    this.log('Starting visa requirements ingestion');

    try {
      const rawData = await this.fetchCSV();
      const records = this.parseCSV(rawData);
      
      const validRecords = records.filter(item => this.validate(item));
      this.log(`Parsed ${validRecords.length} valid visa requirement records`);
      
      const transformedRecords = validRecords.map(item => this.transform(item));
      const saveResult = await this.saveToDatabase(transformedRecords as VisaRecord[]);

      const result = this.createResult({
        recordsProcessed: records.length,
        recordsCreated: saveResult.created,
        recordsUpdated: saveResult.updated,
        durationMs: Date.now() - startTime,
      });

      this.log('Visa requirements ingestion completed', result);
      return result;
    } catch (error) {
      this.logError('Visa requirements ingestion failed', error);
      
      return this.createResult({
        durationMs: Date.now() - startTime,
        errors: [{
          message: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const record = data as Record<string, unknown>;
    return Boolean(
      record.passportCountryCode && 
      typeof record.passportCountryCode === 'string' &&
      record.passportCountryCode.length === 2 &&
      record.destinationCountryCode && 
      typeof record.destinationCountryCode === 'string' &&
      record.destinationCountryCode.length === 2 &&
      record.visaCategory
    );
  }

  transform(data: unknown): VisaRecord {
    const record = data as Record<string, unknown>;
    
    return {
      passportCountryCode: (record.passportCountryCode as string).toUpperCase(),
      destinationCountryCode: (record.destinationCountryCode as string).toUpperCase(),
      visaCategory: this.normalizeVisaCategory(record.visaCategory as string),
      stayDuration: record.stayDuration as number | null,
      notes: record.notes as string | null,
    };
  }

  private normalizeVisaCategory(raw: string): string {
    const value = raw.trim().toUpperCase();
    
    if (value === 'VF' || value.includes('VISA FREE') || value === '-1') {
      return 'VF';
    }
    if (value === 'VOA' || value.includes('VISA ON ARRIVAL')) {
      return 'VOA';
    }
    if (value === 'VR' || value.includes('VISA REQUIRED')) {
      return 'VR';
    }
    if (value.includes('EVISA') || value === 'E-VISA') {
      return 'eVisa';
    }
    if (value === 'ETA' || value.includes('ELECTRONIC TRAVEL')) {
      return 'ETA';
    }
    
    const numMatch = value.match(/^(\d+)/);
    if (numMatch) {
      return 'VF';
    }
    
    return 'VR';
  }

  private extractDuration(value: string): number | null {
    const numMatch = value.match(/^(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }
    return null;
  }

  private async fetchCSV(): Promise<string> {
    this.log(`Fetching CSV from ${CSV_URL}`);
    
    const response = await this.withRetry(
      () => fetch(CSV_URL, {
        headers: {
          'Accept': 'text/csv,text/plain,*/*',
          'User-Agent': 'TRAVI-Ingestion/1.0'
        }
      }),
      'fetch CSV'
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    return response.text();
  }

  private parseCSV(csvContent: string): VisaRecord[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    const headerLine = lines[0];
    const headers = this.parseCSVLine(headerLine);
    
    const passportColumn = headers[0];
    const destinationCodes = headers.slice(1);
    
    this.log(`Parsed ${destinationCodes.length} destination countries from header`);

    const records: VisaRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      const passportCode = values[0]?.trim();
      
      if (!passportCode || passportCode.length !== 2) continue;

      for (let j = 1; j < values.length && j <= destinationCodes.length; j++) {
        const destinationCode = destinationCodes[j - 1]?.trim();
        const rawValue = values[j]?.trim() || '';
        
        if (!destinationCode || destinationCode.length !== 2) continue;
        if (passportCode === destinationCode) continue;

        const duration = this.extractDuration(rawValue);
        
        records.push({
          passportCountryCode: passportCode.toUpperCase(),
          destinationCountryCode: destinationCode.toUpperCase(),
          visaCategory: rawValue,
          stayDuration: duration,
          notes: null,
        });
      }
    }

    return records;
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

  protected async saveToDatabase(records: VisaRecord[]): Promise<{ created: number; updated: number }> {
    this.log(`Saving ${records.length} visa requirement records to database`);
    
    let created = 0;
    let updated = 0;
    
    const batchSize = this.source.config.batchSize;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          const existing = await db
            .select()
            .from(visaRequirements)
            .where(
              and(
                eq(visaRequirements.passportCountryCode, record.passportCountryCode),
                eq(visaRequirements.destinationCountryCode, record.destinationCountryCode)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(visaRequirements)
              .set({
                visaCategory: record.visaCategory,
                stayDuration: record.stayDuration,
                notes: record.notes,
                sourceUrl: SOURCE_URL,
                lastUpdated: new Date(),
              } as any)
              .where(eq(visaRequirements.id, existing[0].id));
            updated++;
          } else {
            await db.insert(visaRequirements).values({
              passportCountryCode: record.passportCountryCode,
              destinationCountryCode: record.destinationCountryCode,
              visaCategory: record.visaCategory,
              stayDuration: record.stayDuration,
              notes: record.notes,
              sourceUrl: SOURCE_URL,
              lastUpdated: new Date(),
            } as any);
            created++;
          }
        } catch (error) {
          this.logError(`Failed to save record: ${record.passportCountryCode} -> ${record.destinationCountryCode}`, error);
        }
      }
      
      if (i + batchSize < records.length) {
        this.log(`Processed ${Math.min(i + batchSize, records.length)}/${records.length} records`);
      }
    }

    this.log(`Database save complete: ${created} created, ${updated} updated`);
    return { created, updated };
  }
}
