/**
 * VAMS Search Service
 * Unified search across all stock image providers with caching
 */

import { db } from "../../db";
import { vamsSearchCache } from "../../../shared/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { getAvailableProviders, getProvider } from "../providers";
import {
  VamsSearchOptions,
  VamsSearchResult,
  ProviderSearchResult,
  VamsProvider,
  DEFAULT_PROVIDERS,
} from "../types";
import { log } from "../../lib/logger";
import crypto from "crypto";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

export class VamsSearchService {
  private static instance: VamsSearchService;

  static getInstance(): VamsSearchService {
    if (!VamsSearchService.instance) {
      VamsSearchService.instance = new VamsSearchService();
    }
    return VamsSearchService.instance;
  }

  /**
   * Search across multiple providers
   */
  async search(options: VamsSearchOptions): Promise<VamsSearchResult> {
    const startTime = Date.now();
    const providers = options.providers || DEFAULT_PROVIDERS;

    // Check cache first
    const cacheKey = this.buildQueryHash(options.query, options);
    const cached = await this.getFromCache(cacheKey);

    if (cached) {
      log.debug({ message: `[VamsSearch] Cache hit for: ${options.query}` });
      return {
        ...cached,
        cached: true,
        searchTimeMs: Date.now() - startTime,
      };
    }

    // Search all providers in parallel
    const providerResults = await Promise.allSettled(
      providers
        .filter(p => this.isStockProvider(p))
        .map(providerName => this.searchProvider(providerName, options))
    );

    // Aggregate results
    const results: ProviderSearchResult[] = [];
    const providerStats: VamsSearchResult["providers"] = [];

    providers.forEach((providerName, index) => {
      if (!this.isStockProvider(providerName)) return;

      const result = providerResults[index];

      if (result.status === "fulfilled") {
        results.push(...result.value);
        providerStats.push({
          provider: providerName,
          results: result.value.length,
        });
      } else {
        providerStats.push({
          provider: providerName,
          results: 0,
          error: result.reason?.message || "Unknown error",
        });
      }
    });

    // Interleave results from different providers for better UX
    const interleavedResults = this.interleaveResults(
      results,
      providers.filter(this.isStockProvider)
    );

    const searchResult: VamsSearchResult = {
      success: true,
      query: options.query,
      totalResults: interleavedResults.length,
      results: interleavedResults,
      providers: providerStats,
      cached: false,
      searchTimeMs: Date.now() - startTime,
    };

    // Cache the result
    await this.saveToCache(cacheKey, searchResult);

    return searchResult;
  }

  /**
   * Search a single provider
   */
  private async searchProvider(
    providerName: VamsProvider,
    options: VamsSearchOptions
  ): Promise<ProviderSearchResult[]> {
    const provider = getProvider(providerName);

    if (!provider) {
      log.warn(`[VamsSearch] Provider ${providerName} not available`);
      return [];
    }

    try {
      return await provider.search(options);
    } catch (error) {
      log.error(`[VamsSearch] Error searching ${providerName}:`, error);
      throw error;
    }
  }

  /**
   * Get asset from a specific provider
   */
  async getAsset(provider: VamsProvider, providerId: string): Promise<ProviderSearchResult | null> {
    const providerInstance = getProvider(provider);

    if (!providerInstance || !providerInstance.getAsset) {
      return null;
    }

    try {
      return await providerInstance.getAsset(providerId);
    } catch (error) {
      log.error(`[VamsSearch] Error getting asset ${providerId} from ${provider}:`, error);
      return null;
    }
  }

  /**
   * Check if provider is a stock provider (not AI generation or upload)
   */
  private isStockProvider(provider: VamsProvider): boolean {
    return ["unsplash", "pexels", "pixabay"].includes(provider);
  }

  /**
   * Interleave results from different providers
   */
  private interleaveResults(
    results: ProviderSearchResult[],
    providers: VamsProvider[]
  ): ProviderSearchResult[] {
    const byProvider: Record<string, ProviderSearchResult[]> = {};

    // Group by provider
    for (const result of results) {
      if (!byProvider[result.provider]) {
        byProvider[result.provider] = [];
      }
      byProvider[result.provider].push(result);
    }

    // Interleave
    const interleaved: ProviderSearchResult[] = [];
    let index = 0;
    let hasMore = true;

    while (hasMore) {
      hasMore = false;
      for (const provider of providers) {
        const providerResults = byProvider[provider];
        if (providerResults && providerResults[index]) {
          interleaved.push(providerResults[index]);
          hasMore = true;
        }
      }
      index++;
    }

    return interleaved;
  }

  /**
   * Build cache key hash from search options
   */
  private buildQueryHash(query: string, options: VamsSearchOptions): string {
    const parts = [
      query.toLowerCase().trim(),
      options.page || 1,
      options.perPage || 20,
      options.orientation || "any",
      options.color || "",
      options.locale || "",
    ];

    return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
  }

  /**
   * Get results from cache (note: caching is disabled until schema is synced)
   */
  private async getFromCache(_cacheKey: string): Promise<VamsSearchResult | null> {
    // Cache disabled due to schema mismatch - returns null to always fetch fresh
    return null;
  }

  /**
   * Save results to cache (note: caching is disabled until schema is synced)
   */
  private async saveToCache(_cacheKey: string, _result: VamsSearchResult): Promise<void> {
    // Cache disabled due to schema mismatch - no-op
    // The schema stores cache per provider, but we cache aggregated results
    // To fix: either update schema or implement per-provider caching
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    try {
      const now = new Date();
      const result = await db.delete(vamsSearchCache).where(lt(vamsSearchCache.expiresAt, now));

      return (result as any).rowCount || 0;
    } catch (error) {
      log.error("[VamsSearch] Cache cleanup error:", error);
      return 0;
    }
  }
}

export const vamsSearchService = VamsSearchService.getInstance();
