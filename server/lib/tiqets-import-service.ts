/**
 * Tiqets Import Service
 * Handles importing attractions from Tiqets API to our database
 */

import { TiqetsClient } from './tiqets-client';
import { TiqetsTransformer } from './tiqets-transformer';
import { db } from '../db';
import { tiqetsCities, tiqetsAttractions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

type ProgressCallback = (message: string) => void;

export class TiqetsImportService {
  private client = new TiqetsClient();
  
  /**
   * Step 1: Find Tiqets city IDs for our 16 cities
   */
  async findAllCityIds(progressCallback?: ProgressCallback): Promise<{ found: number; total: number; details: Array<{ name: string; tiqetsId: string | null }> }> {
    const log = (msg: string) => {
      console.log(msg);
      if (progressCallback) progressCallback(msg);
    };
    
    log('🔍 Searching Tiqets API for city IDs...');
    
    // Get our 16 cities from database
    const ourCities = await db.select().from(tiqetsCities).where(eq(tiqetsCities.isActive, true));
    
    let page = 1;
    let found = 0;
    const maxPages = 30; // ~3000 cities max
    const foundDetails: Array<{ name: string; tiqetsId: string | null }> = [];
    
    while (found < ourCities.length && page <= maxPages) {
      log(`  Page ${page}...`);
      
      try {
        const response = await this.client.getCities(page);
        
        for (const tiqetsCity of response.cities || []) {
          // Match by name (case-insensitive)
          const match = ourCities.find(c => 
            c.name.toLowerCase() === tiqetsCity.name.toLowerCase()
          );
          
          if (match && !match.tiqetsCityId) {
            // Update with Tiqets city ID
            await db.update(tiqetsCities)
              .set({
                tiqetsCityId: tiqetsCity.id,
                countryName: tiqetsCity.country_name || null,
                updatedAt: new Date(),
              } as any)
              .where(eq(tiqetsCities.id, match.id));
            
            log(`  ✅ ${match.name} → ${tiqetsCity.id}`);
            foundDetails.push({ name: match.name, tiqetsId: tiqetsCity.id });
            found++;
            
            if (found === ourCities.length) break;
          }
        }
        
        // Check if more pages exist
        const totalPages = Math.ceil((response.pagination?.total || 0) / 100);
        if (page >= totalPages) break;
        
        page++;
        await this.sleep(1000); // Rate limiting
      } catch (error: any) {
        log(`  ❌ Error on page ${page}: ${error.message}`);
        break;
      }
    }
    
    log(`\n✅ Found ${found}/${ourCities.length} cities`);
    return { found, total: ourCities.length, details: foundDetails };
  }
  
  /**
   * Step 2: Import attractions for ONE city
   */
  async importCity(
    tiqetsCityId: string, 
    cityName: string,
    progressCallback?: ProgressCallback
  ): Promise<{ imported: number; updated: number; total: number; errors: string[] }> {
    const log = (msg: string) => {
      console.log(msg);
      if (progressCallback) progressCallback(msg);
    };
    
    log(`\n🔄 Importing ${cityName}...`);
    
    let page = 1;
    let imported = 0;
    let updated = 0;
    const errors: string[] = [];
    
    while (true) {
      try {
        const response = await this.client.getProducts(tiqetsCityId, page);
        const products = response.products || [];
        
        if (products.length === 0) {
          break;
        }
        
        for (const product of products) {
          try {
            const result = await this.saveAttraction(product, cityName);
            if (result === 'inserted') imported++;
            if (result === 'updated') updated++;
          } catch (error: any) {
            errors.push(`Product ${product.id}: ${error.message}`);
          }
        }
        
        log(`  Page ${page}: +${products.length} (${imported} new, ${updated} updated)`);
        
        // Check if more pages exist
        const totalPages = Math.ceil((response.pagination?.total || 0) / 100);
        if (page >= totalPages) break;
        
        page++;
        await this.sleep(1000); // Rate limiting
      } catch (error: any) {
        log(`  ❌ Error on page ${page}: ${error.message}`);
        errors.push(`Page ${page}: ${error.message}`);
        break;
      }
    }
    
    // Update city stats
    await db.update(tiqetsCities)
      .set({
        attractionCount: imported + updated,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(tiqetsCities.tiqetsCityId, tiqetsCityId));
    
    log(`✅ ${cityName}: ${imported} new + ${updated} updated = ${imported + updated} total`);
    
    return { imported, updated, total: imported + updated, errors };
  }
  
  /**
   * Step 3: Import ALL 16 cities
   */
  async importAllCities(progressCallback?: ProgressCallback): Promise<{
    cities: number;
    imported: number;
    updated: number;
    total: number;
    errors: string[];
    cityResults: Array<{ cityName: string; imported: number; updated: number; total: number }>;
  }> {
    const log = (msg: string) => {
      console.log(msg);
      if (progressCallback) progressCallback(msg);
    };
    
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('🚀 Starting import for ALL cities');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get cities with Tiqets IDs
    const cities = await db.select()
      .from(tiqetsCities)
      .where(sql`${tiqetsCities.isActive} = true AND ${tiqetsCities.tiqetsCityId} IS NOT NULL`);
    
    let totalImported = 0;
    let totalUpdated = 0;
    const allErrors: string[] = [];
    const cityResults: Array<{ cityName: string; imported: number; updated: number; total: number }> = [];
    
    for (const city of cities) {
      if (!city.tiqetsCityId) continue;
      
      const result = await this.importCity(
        city.tiqetsCityId,
        city.name,
        progressCallback
      );
      
      totalImported += result.imported;
      totalUpdated += result.updated;
      allErrors.push(...result.errors);
      cityResults.push({
        cityName: city.name,
        imported: result.imported,
        updated: result.updated,
        total: result.total,
      });
      
      await this.sleep(2000); // 2 seconds between cities
    }
    
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('✅ IMPORT COMPLETE!');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log(`Cities: ${cities.length}`);
    log(`New attractions: ${totalImported}`);
    log(`Updated attractions: ${totalUpdated}`);
    log(`Total attractions: ${totalImported + totalUpdated}`);
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return {
      cities: cities.length,
      imported: totalImported,
      updated: totalUpdated,
      total: totalImported + totalUpdated,
      errors: allErrors,
      cityResults,
    };
  }
  
  /**
   * Save or update attraction in database
   */
  private async saveAttraction(product: any, cityName: string): Promise<'inserted' | 'updated'> {
    // Transform Tiqets data to our format
    const data = TiqetsTransformer.transformProduct(product, cityName) as any;
    
    // Check if already exists
    const existing = await db.select({ id: tiqetsAttractions.id })
      .from(tiqetsAttractions)
      .where(eq(tiqetsAttractions.tiqetsId, data.tiqetsId));
    
    if (existing && existing.length > 0) {
      // Update existing - only update sync fields, keep AI-generated content
      await db.update(tiqetsAttractions)
        .set({
          productSlug: data.productSlug,
          venueName: data.venueName,
          venueAddress: data.venueAddress,
          latitude: data.latitude,
          longitude: data.longitude,
          duration: data.duration,
          languages: data.languages,
          wheelchairAccess: data.wheelchairAccess,
          smartphoneTicket: data.smartphoneTicket,
          instantTicketDelivery: data.instantTicketDelivery,
          cancellationPolicy: data.cancellationPolicy,
          tiqetsHighlights: data.tiqetsHighlights,
          tiqetsWhatsIncluded: data.tiqetsWhatsIncluded,
          tiqetsWhatsExcluded: data.tiqetsWhatsExcluded,
          tiqetsDescription: data.tiqetsDescription,
          tiqetsImages: data.tiqetsImages,
          tiqetsRating: data.tiqetsRating,
          tiqetsReviewCount: data.tiqetsReviewCount,
          ratingLabel: data.ratingLabel,
          productUrl: data.productUrl,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(tiqetsAttractions.tiqetsId, data.tiqetsId));
      
      return 'updated';
    } else {
      // Insert new
      await db.insert(tiqetsAttractions).values(data as any);
      return 'inserted';
    }
  }
  
  /**
   * Helper: Sleep for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const tiqetsImportService = new TiqetsImportService();
