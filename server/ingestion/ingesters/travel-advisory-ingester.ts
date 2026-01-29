/**
 * Travel Advisory Ingester
 * Fetches travel advisories from the travel-advisory.info API (free, no key required)
 * API docs: https://www.travel-advisory.info/data-api
 */

import { BaseIngester } from "../base-ingester";
import type { DataSource, IngestionResult } from "../types";

interface TravelAdvisoryApiResponse {
  api_status: { request: { item: string } };
  data: Record<
    string,
    {
      iso_alpha2: string;
      name: string;
      continent: string;
      advisory: {
        score: number;
        sources_active: number;
        message: string;
        updated: string;
        source: string;
      };
    }
  >;
}

export class TravelAdvisoryIngester extends BaseIngester {
  source: DataSource = {
    id: "travel-advisory",
    name: "Travel Advisory Feed",
    displayName: "Travel Advisories",
    description: "Travel safety scores from travel-advisory.info aggregating government sources",
    type: "api",
    baseUrl: "https://www.travel-advisory.info/api",
    config: {
      enabled: true,
      cronSchedule: "0 */6 * * *",
      batchSize: 300,
      retryAttempts: 3,
    },
  };

  async ingest(): Promise<IngestionResult> {
    const startTime = Date.now();
    this.log("Starting travel advisory ingestion");

    try {
      const rawData = await this.fetchAdvisories();

      const validRecords = rawData.filter(item => this.validate(item));
      const transformedRecords = validRecords.map(item => this.transform(item));
      const saveResult = await this.saveToDatabase(transformedRecords);

      const result = this.createResult({
        recordsProcessed: rawData.length,
        recordsCreated: saveResult.created,
        recordsUpdated: saveResult.updated,
        durationMs: Date.now() - startTime,
      });

      this.log("Travel advisory ingestion completed", result);
      return result;
    } catch (error) {
      this.logError("Travel advisory ingestion failed", error);

      return this.createResult({
        durationMs: Date.now() - startTime,
        errors: [
          {
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      });
    }
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== "object") return false;

    const record = data as Record<string, unknown>;
    return Boolean(
      record.iso_alpha2 &&
      record.name &&
      record.advisory &&
      typeof (record.advisory as any).score === "number"
    );
  }

  transform(data: unknown): unknown {
    const record = data as Record<string, unknown>;
    const advisory = record.advisory as Record<string, unknown>;
    const score = advisory.score as number;

    // Map score to advisory level: 0-2.5 = low, 2.5-3.5 = moderate, 3.5-4.5 = high, 4.5+ = extreme
    let advisoryLevel: string;
    if (score <= 2.5) advisoryLevel = "low";
    else if (score <= 3.5) advisoryLevel = "moderate";
    else if (score <= 4.5) advisoryLevel = "high";
    else advisoryLevel = "extreme";

    return {
      countryCode: record.iso_alpha2,
      countryName: record.name,
      continent: record.continent,
      advisoryLevel,
      score,
      sourcesActive: advisory.sources_active,
      title: `Travel Advisory: ${record.name}`,
      description: advisory.message || "",
      effectiveDate: advisory.updated || new Date().toISOString(),
      source: this.source.id,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch advisories from travel-advisory.info API
   */
  private async fetchAdvisories(): Promise<unknown[]> {
    this.log("Fetching travel advisories from travel-advisory.info");

    const response = await fetch("https://www.travel-advisory.info/api");
    if (!response.ok) {
      throw new Error(`Travel advisory API returned ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as TravelAdvisoryApiResponse;
    if (!json.data) {
      throw new Error("Invalid API response: missing data field");
    }

    return Object.values(json.data);
  }
}
