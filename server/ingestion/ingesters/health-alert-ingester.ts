/**
 * Health Alert Ingester
 * Ingests health alerts from WHO Disease Outbreak News API
 * API Documentation: https://www.who.int/api/news/diseaseoutbreaknews/sfhelp
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { healthAlerts, destinations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface WHODiseaseOutbreakNews {
  DonId: string;
  Title: string;
  OverrideTitle?: string;
  TitleSuffix?: string;
  Summary?: string;
  Overview?: string;
  Epidemiology?: string;
  Assessment?: string;
  Response?: string;
  Advice?: string;
  FurtherInformation?: string;
  PublicationDate: string;
  PublicationDateAndTime?: string;
  UrlName: string;
  ItemDefaultUrl?: string;
  regionscountries?: string;
}

interface WHOApiResponse {
  value: WHODiseaseOutbreakNews[];
}

const COUNTRY_NAME_ALIASES: Record<string, string[]> = {
  "AE": ["United Arab Emirates", "UAE", "Emirates"],
  "GB": ["United Kingdom", "UK", "Great Britain", "England", "Britain"],
  "US": ["United States", "United States of America", "USA", "America"],
  "CN": ["China", "People's Republic of China"],
  "JP": ["Japan"],
  "IN": ["India"],
  "AU": ["Australia"],
  "FR": ["France"],
  "DE": ["Germany"],
  "IT": ["Italy"],
  "ES": ["Spain"],
  "CA": ["Canada"],
  "BR": ["Brazil"],
  "SG": ["Singapore"],
  "TH": ["Thailand"],
  "ID": ["Indonesia"],
  "MY": ["Malaysia"],
  "PH": ["Philippines"],
  "VN": ["Vietnam", "Viet Nam"],
  "KR": ["South Korea", "Republic of Korea", "Korea"],
  "SA": ["Saudi Arabia"],
  "EG": ["Egypt"],
  "TR": ["Turkey", "Türkiye"],
  "ZA": ["South Africa"],
  "NG": ["Nigeria"],
  "KE": ["Kenya"],
  "MA": ["Morocco"],
  "CD": ["Democratic Republic of the Congo", "DRC", "Congo"],
  "PK": ["Pakistan"],
  "BD": ["Bangladesh"],
  "RU": ["Russia", "Russian Federation"],
  "MX": ["Mexico"],
  "AR": ["Argentina"],
  "CO": ["Colombia"],
  "PE": ["Peru"],
  "CL": ["Chile"],
  "NL": ["Netherlands", "Holland"],
  "BE": ["Belgium"],
  "SE": ["Sweden"],
  "CH": ["Switzerland"],
  "AT": ["Austria"],
  "PT": ["Portugal"],
  "GR": ["Greece"],
  "PL": ["Poland"],
  "CZ": ["Czech Republic", "Czechia"],
  "HU": ["Hungary"],
  "RO": ["Romania"],
  "NZ": ["New Zealand"],
  "IR": ["Iran"],
  "IQ": ["Iraq"],
  "IL": ["Israel"],
  "JO": ["Jordan"],
  "LB": ["Lebanon"],
  "SD": ["Sudan"],
  "ET": ["Ethiopia"],
  "TZ": ["Tanzania"],
  "UG": ["Uganda"],
  "GH": ["Ghana"],
  "HK": ["Hong Kong"],
};

function countryNameToIso(countryName: string): string | null {
  const normalized = countryName.trim().toLowerCase();
  for (const [iso, aliases] of Object.entries(COUNTRY_NAME_ALIASES)) {
    if (aliases.some(alias => alias.toLowerCase() === normalized)) {
      return iso;
    }
  }
  return null;
}

function isoToCountryAliases(iso: string): string[] {
  return COUNTRY_NAME_ALIASES[iso] || [];
}

interface TransformedHealthAlert {
  donId: string;
  alertType: "disease_outbreak" | "vaccination_required" | "travel_restriction" | "general_health";
  title: string;
  description: string | null;
  details: Record<string, unknown>;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "resolved" | "monitoring";
  sourceUrl: string;
  issuedDate: Date;
  countryCodes: string[];
}

export class HealthAlertIngester extends BaseIngester {
  source: DataSource = {
    id: 'health-alert',
    name: 'WHO Disease Outbreak News',
    displayName: 'Health Alerts',
    description: 'WHO disease outbreak news and health advisories for travel destinations',
    type: 'api',
    baseUrl: 'https://www.who.int/api/news/diseaseoutbreaknews',
    config: {
      enabled: true,
      cronSchedule: '0 */4 * * *',
      batchSize: 100,
      retryAttempts: 3,
    },
  };

  async ingest(): Promise<IngestionResult> {
    const startTime = Date.now();
    this.log('Starting WHO health alert ingestion');

    try {
      const rawData = await this.fetchHealthAlerts();
      this.log(`Fetched ${rawData.length} disease outbreak news items from WHO`);

      const validRecords = rawData.filter(item => this.validate(item));
      this.log(`${validRecords.length} valid records after validation`);

      const transformedRecords = validRecords.map(item => this.transform(item));
      const saveResult = await this.saveToDatabase(transformedRecords as TransformedHealthAlert[]);

      const result = this.createResult({
        recordsProcessed: rawData.length,
        recordsCreated: saveResult.created,
        recordsUpdated: saveResult.updated,
        durationMs: Date.now() - startTime,
      });

      this.log('WHO health alert ingestion completed', result);
      return result;
    } catch (error) {
      this.logError('WHO health alert ingestion failed', error);
      
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
    
    const record = data as WHODiseaseOutbreakNews;
    return Boolean(record.DonId && record.Title && record.PublicationDate);
  }

  transform(data: unknown): TransformedHealthAlert {
    const record = data as WHODiseaseOutbreakNews;
    
    const description = record.Summary || record.Overview || null;
    const countryCodes = this.extractCountryCodes(record);
    const severity = this.determineSeverity(record);
    
    return {
      donId: record.DonId,
      alertType: 'disease_outbreak',
      title: record.Title,
      description,
      details: {
        epidemiology: record.Epidemiology || null,
        assessment: record.Assessment || null,
        response: record.Response || null,
        advice: record.Advice || null,
        furtherInfo: record.FurtherInformation || null,
      },
      severity,
      status: 'active',
      sourceUrl: `https://www.who.int/emergencies/disease-outbreak-news/item/${record.UrlName}`,
      issuedDate: new Date(record.PublicationDate),
      countryCodes,
    };
  }

  private stripHtml(str: string): string {
    return str.replace(/<[^>]*>/g, ' ');
  }

  private removeParentheses(str: string): string {
    return str.replace(/\([^)]*\)/g, '');
  }

  private extractCountryCodes(record: WHODiseaseOutbreakNews): string[] {
    const countryCodes: string[] = [];
    
    let countryText = record.regionscountries || '';
    countryText = this.stripHtml(countryText);
    countryText = this.removeParentheses(countryText);
    
    const parts = countryText.split(/[,;]|\band\b|&/).map(s => s.trim()).filter(Boolean);
    
    for (const part of parts) {
      const isoCode = countryNameToIso(part);
      if (isoCode && !countryCodes.includes(isoCode)) {
        countryCodes.push(isoCode);
      }
    }
    
    if (countryCodes.length === 0) {
      const titleCountries = this.extractCountriesFromTitle(record.Title);
      for (const code of titleCountries) {
        if (!countryCodes.includes(code)) {
          countryCodes.push(code);
        }
      }
    }
    
    return countryCodes;
  }

  private extractCountriesFromTitle(title: string): string[] {
    const countryCodes: string[] = [];
    
    const dashMatch = title.match(/[-–—]\s*([^-–—]+)$/);
    if (dashMatch) {
      const countryPart = dashMatch[1].trim();
      const isoCode = countryNameToIso(countryPart);
      if (isoCode) {
        countryCodes.push(isoCode);
        return countryCodes;
      }
      const parts = countryPart.split(/\band\b|&|,/).map(s => s.trim());
      for (const part of parts) {
        const code = countryNameToIso(part);
        if (code && !countryCodes.includes(code)) {
          countryCodes.push(code);
        }
      }
    }
    
    const inMatch = title.match(/\bin\s+([A-Z][a-zA-Z\s]+)(?:\s|$)/);
    if (inMatch && countryCodes.length === 0) {
      const isoCode = countryNameToIso(inMatch[1].trim());
      if (isoCode) {
        countryCodes.push(isoCode);
      }
    }
    
    return countryCodes;
  }

  private determineSeverity(record: WHODiseaseOutbreakNews): "low" | "medium" | "high" | "critical" {
    const title = record.Title.toLowerCase();
    const summary = (record.Summary || '').toLowerCase();
    const assessment = (record.Assessment || '').toLowerCase();
    const combined = `${title} ${summary} ${assessment}`;
    
    if (combined.includes('critical') || combined.includes('emergency') || combined.includes('pandemic')) {
      return 'critical';
    }
    if (combined.includes('high risk') || combined.includes('outbreak') || combined.includes('severe')) {
      return 'high';
    }
    if (combined.includes('moderate') || combined.includes('increasing') || combined.includes('concern')) {
      return 'medium';
    }
    return 'low';
  }

  private async fetchHealthAlerts(): Promise<WHODiseaseOutbreakNews[]> {
    this.log(`Fetching health alerts from ${this.source.baseUrl}`);
    
    const response = await fetch(this.source.baseUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Travi-CMS/1.0 (Travel Health Information Service)',
      },
    });

    if (!response.ok) {
      throw new Error(`WHO API returned status ${response.status}: ${response.statusText}`);
    }

    const data: WHOApiResponse = await response.json();
    
    if (!data.value || !Array.isArray(data.value)) {
      throw new Error('Invalid WHO API response format');
    }

    return data.value;
  }

  private async saveToDatabase(records: TransformedHealthAlert[]): Promise<{ created: number; updated: number }> {
    this.log(`Saving ${records.length} health alert records to database`);
    
    let created = 0;
    let updated = 0;

    const allDestinations = await db.select({ id: destinations.id, country: destinations.country }).from(destinations);
    const countryToDestinationIds = new Map<string, string[]>();
    
    for (const dest of allDestinations) {
      if (dest.country) {
        const isoCode = countryNameToIso(dest.country);
        if (isoCode) {
          const existing = countryToDestinationIds.get(isoCode) || [];
          existing.push(dest.id);
          countryToDestinationIds.set(isoCode, existing);
        }
      }
    }
    
    this.log(`Mapped ${countryToDestinationIds.size} ISO codes to destinations`);

    for (const record of records) {
      for (const countryCode of record.countryCodes) {
        const destinationIds = countryToDestinationIds.get(countryCode) || [];
        if (destinationIds.length === 0) continue;

        for (const destinationId of destinationIds) {
          try {
            const existingAlert = await db
              .select({ id: healthAlerts.id })
              .from(healthAlerts)
              .where(
                and(
                  eq(healthAlerts.source, record.donId),
                  eq(healthAlerts.destinationId, destinationId)
                )
              )
              .limit(1);

            if (existingAlert.length > 0) {
              await db
                .update(healthAlerts)
                .set({
                  title: record.title,
                  description: record.description,
                  details: record.details,
                  severity: record.severity,
                  status: record.status,
                  sourceUrl: record.sourceUrl,
                  updatedAt: new Date(),
                })
                .where(eq(healthAlerts.id, existingAlert[0].id));
              updated++;
            } else {
              await db.insert(healthAlerts).values({
                destinationId,
                alertType: record.alertType,
                title: record.title,
                description: record.description,
                details: record.details,
                severity: record.severity,
                status: record.status,
                source: record.donId,
                sourceUrl: record.sourceUrl,
                issuedDate: record.issuedDate,
              });
              created++;
            }
          } catch (error) {
            this.logError(`Failed to save health alert ${record.donId} for ${countryCode}`, error);
          }
        }
      }
    }

    this.log(`Health alerts saved: ${created} created, ${updated} updated`);
    return { created, updated };
  }
}
