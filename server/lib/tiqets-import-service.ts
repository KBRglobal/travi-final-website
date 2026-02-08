/**
 * Tiqets Import Service
 *
 * Imports attractions from Tiqets API into the database.
 * Handles city discovery, product fetching, and data transformation.
 *
 * Phase 4: Replace STUB with real implementation
 */

import { db } from "../db";
import { tiqetsAttractions, tiqetsCities } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { TiqetsClient, TiqetsProduct, getTiqetsClient } from "./tiqets-client";
import { logger } from "./logger";

// ============================================================================
// TYPES
// ============================================================================

interface ImportCityResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface FindCitiesResult {
  found: number;
  total: number;
  details: Array<{
    cityName: string;
    tiqetsCityId: string | null;
    status: "found" | "not_found" | "error";
    message?: string;
  }>;
}

// Our target cities (from the existing tiqets_cities table)
const TARGET_CITIES = [
  "Dubai",
  "Abu Dhabi",
  "Paris",
  "London",
  "Barcelona",
  "Amsterdam",
  "Rome",
  "New York",
  "Los Angeles",
  "Miami",
  "Las Vegas",
  "Singapore",
  "Bangkok",
  "Tokyo",
  "Istanbul",
  "Hong Kong",
];

// ============================================================================
// TIQETS IMPORT SERVICE
// ============================================================================

export class TiqetsImportService {
  private readonly client: TiqetsClient;

  constructor() {
    this.client = getTiqetsClient();
  }

  /**
   * Find Tiqets city IDs for all target cities.
   */
  async findAllCityIds(log?: (msg: string) => void): Promise<FindCitiesResult> {
    const logMessage = log || ((msg: string) => logger.info(msg));

    if (!this.client.isConfigured()) {
      logMessage("ERROR: Tiqets API not configured");
      return { found: 0, total: TARGET_CITIES.length, details: [] };
    }

    const details: FindCitiesResult["details"] = [];
    let found = 0;

    logMessage(`Starting city ID discovery for ${TARGET_CITIES.length} cities...`);

    for (const cityName of TARGET_CITIES) {
      try {
        logMessage(`Searching for: ${cityName}`);

        const result = await this.client.searchCities(cityName);

        if (result.cities.length > 0) {
          // Find best match (exact name match preferred)
          const exactMatch = result.cities.find(
            c => c.name.toLowerCase() === cityName.toLowerCase()
          );
          const bestMatch = exactMatch || result.cities[0];

          // Update database with Tiqets city ID
          await db
            .update(tiqetsCities)
            .set({
              tiqetsCityId: bestMatch.id,
              countryName: bestMatch.country?.name,
              updatedAt: new Date(),
            } as any)
            .where(eq(tiqetsCities.name, cityName));

          details.push({
            cityName,
            tiqetsCityId: bestMatch.id,
            status: "found",
            message: `Found: ${bestMatch.name}, ${bestMatch.country?.name}`,
          });
          found++;
          logMessage(`  ✓ Found: ${bestMatch.name} (ID: ${bestMatch.id})`);
        } else {
          details.push({
            cityName,
            tiqetsCityId: null,
            status: "not_found",
            message: "No matching city found in Tiqets",
          });
          logMessage(`  ✗ Not found: ${cityName}`);
        }

        // Small delay between requests
        await this.delay(300);
      } catch (error) {
        details.push({
          cityName,
          tiqetsCityId: null,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        logMessage(`  ✗ Error for ${cityName}: ${error}`);
      }
    }

    logMessage(`City discovery complete: ${found}/${TARGET_CITIES.length} found`);

    return {
      found,
      total: TARGET_CITIES.length,
      details,
    };
  }

  /**
   * Import attractions for a single city.
   */
  async importCity(
    tiqetsCityId: string,
    cityName: string,
    log?: (msg: string) => void
  ): Promise<ImportCityResult> {
    const logMessage = log || ((msg: string) => logger.info(msg));

    if (!this.client.isConfigured()) {
      logMessage("ERROR: Tiqets API not configured");
      return { imported: 0, updated: 0, skipped: 0, errors: ["API not configured"] };
    }

    const result: ImportCityResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    logMessage(`Importing attractions for ${cityName} (ID: ${tiqetsCityId})...`);

    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.getProductsByCity(tiqetsCityId, {
          page,
          perPage: 50,
        });

        logMessage(`  Page ${page}: Found ${response.products.length} products`);

        for (const product of response.products) {
          try {
            const importResult = await this.importProduct(product, cityName);

            if (importResult === "imported") {
              result.imported++;
            } else if (importResult === "updated") {
              result.updated++;
            } else {
              result.skipped++;
            }
          } catch (error) {
            const errMsg = `Failed to import ${product.title}: ${error}`;
            result.errors.push(errMsg);
            logMessage(`    ✗ ${errMsg}`);
          }
        }

        // Check if there are more pages
        hasMore = response.products.length === 50 && page < 10; // Max 10 pages = 500 products
        page++;

        // Delay between pages
        await this.delay(500);
      }

      // Update city attraction count
      await db
        .update(tiqetsCities)
        .set({
          attractionCount: result.imported + result.updated,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(tiqetsCities.tiqetsCityId, tiqetsCityId));

      logMessage(
        `  Complete: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`
      );
    } catch (error) {
      const errMsg = `City import failed: ${error}`;
      result.errors.push(errMsg);
      logMessage(`  ✗ ${errMsg}`);
    }

    return result;
  }

  /**
   * Import all configured cities.
   */
  async importAllCities(log?: (msg: string) => void): Promise<{ imported: number }> {
    const logMessage = log || ((msg: string) => logger.info(msg));

    if (!this.client.isConfigured()) {
      logMessage("ERROR: Tiqets API not configured");
      return { imported: 0 };
    }

    // Get all cities with Tiqets IDs
    const cities = await db
      .select()
      .from(tiqetsCities)
      .where(sql`${tiqetsCities.tiqetsCityId} IS NOT NULL AND ${tiqetsCities.isActive} = true`);

    logMessage(`Starting import for ${cities.length} cities...`);

    let totalImported = 0;

    for (const city of cities) {
      if (!city.tiqetsCityId) continue;

      const result = await this.importCity(city.tiqetsCityId, city.name, logMessage);
      totalImported += result.imported + result.updated;

      // Delay between cities
      await this.delay(1000);
    }

    logMessage(`All cities imported. Total attractions: ${totalImported}`);

    return { imported: totalImported };
  }

  /**
   * Import or update a single product.
   */
  private async importProduct(
    product: TiqetsProduct,
    cityName: string
  ): Promise<"imported" | "updated" | "skipped"> {
    // Check if product already exists
    const [existing] = await db
      .select()
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.tiqetsId, product.id))
      .limit(1);

    // Generate slug
    const slug = this.generateSlug(product.title);

    // Transform product to our schema
    const attractionData = {
      tiqetsId: product.id,
      productSlug: product.slug,
      cityName: cityName,
      cityId: product.city?.id,
      title: product.title,
      slug: existing?.slug || slug,
      seoSlug: existing?.seoSlug || slug,
      venueName: product.venue?.name || null,
      venueAddress: product.venue?.address || null,
      latitude: product.venue?.latitude?.toString() || null,
      longitude: product.venue?.longitude?.toString() || null,
      duration: product.duration || null,
      languages: product.languages || [],
      wheelchairAccess: product.wheelchair_accessible || false,
      smartphoneTicket: product.smartphone_ticket || false,
      instantTicketDelivery: product.instant_delivery || false,
      cancellationPolicy: product.cancellation_policy || null,
      tiqetsDescription: product.description || null,
      tiqetsSummary: product.summary || null,
      tiqetsHighlights: product.highlights || null,
      tiqetsWhatsIncluded: product.whats_included || null,
      tiqetsWhatsExcluded: product.whats_excluded || null,
      tiqetsImages: product.images || null,
      tiqetsRating: product.rating?.toString() || null,
      tiqetsReviewCount: product.review_count || null,
      priceUsd: product.price?.value?.toString() || null,
      prediscountPriceUsd: product.original_price?.value?.toString() || null,
      discountPercentage: product.discount_percentage || null,
      primaryCategory: product.categories?.[0]?.name || "Attraction",
      secondaryCategories: product.categories?.slice(1).map(c => c.name) || null,
      productUrl: this.client.getAffiliateLink(
        product.product_url || `https://www.tiqets.com/en/${product.slug}`
      ),
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing
      await db
        .update(tiqetsAttractions)
        .set(attractionData as any)
        .where(eq(tiqetsAttractions.id, existing.id));

      return "updated";
    } else {
      // Insert new
      await db.insert(tiqetsAttractions).values({
        ...attractionData,
        status: "imported",
        contentGenerationStatus: "pending",
      } as any);

      return "imported";
    }
  }

  /**
   * Search for a product by name (for attraction detector).
   */
  async searchProduct(query: string, cityName?: string): Promise<TiqetsProduct | null> {
    if (!this.client.isConfigured()) {
      return null;
    }

    try {
      // First, try to find the city ID
      let cityId: string | undefined;
      if (cityName) {
        const cityResult = await this.client.searchCities(cityName);
        if (cityResult.cities.length > 0) {
          cityId = cityResult.cities[0].id;
        }
      }

      const result = await this.client.searchProducts(query, { cityId, perPage: 5 });

      if (result.products.length > 0) {
        return result.products[0];
      }

      return null;
    } catch (error) {
      logger.error({ query, cityName, error }, "[TiqetsImportService] Search failed");
      return null;
    }
  }

  /**
   * Generate a URL-safe slug from a title.
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/(?:^-|-$)/g, "")
      .substring(0, 200);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const tiqetsImportService = new TiqetsImportService();

export function getTiqetsImportService(): TiqetsImportService {
  return tiqetsImportService;
}
