/**
 * Tiqets API Client
 *
 * Official client for Tiqets Partner API v2.
 * Handles authentication, rate limiting, and API calls.
 *
 * Required environment variables:
 * - TIQETS_API_TOKEN: Bearer token for API authentication
 * - TIQETS_PARTNER_ID: Partner ID for affiliate tracking
 */

import { logger } from "./logger";

// ============================================================================
// TYPES
// ============================================================================

export interface TiqetsCity {
  id: string;
  name: string;
  country: {
    id: string;
    name: string;
  };
  timezone: string;
  currency: string;
}

export interface TiqetsProduct {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  whats_included?: string;
  whats_excluded?: string;
  venue?: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  city?: {
    id: string;
    name: string;
  };
  duration?: string;
  languages?: string[];
  wheelchair_accessible?: boolean;
  smartphone_ticket?: boolean;
  instant_delivery?: boolean;
  cancellation_policy?: string;
  images?: Array<{
    small?: string;
    medium?: string;
    large?: string;
    extra_large?: string;
    alt_text?: string;
  }>;
  rating?: number;
  review_count?: number;
  price?: {
    value: number;
    currency: string;
  };
  original_price?: {
    value: number;
    currency: string;
  };
  discount_percentage?: number;
  categories?: Array<{
    id: string;
    name: string;
  }>;
  product_url?: string;
}

export interface TiqetsSearchResult {
  products: TiqetsProduct[];
  total: number;
  page: number;
  per_page: number;
}

export interface TiqetsCitiesResult {
  cities: TiqetsCity[];
  total: number;
}

// ============================================================================
// TIQETS CLIENT
// ============================================================================

export class TiqetsClient {
  private baseUrl = "https://api.tiqets.com/v2";
  private apiToken: string | null;
  private partnerId: string | null;
  private rateLimitDelay = 200; // ms between requests

  constructor() {
    this.apiToken = process.env.TIQETS_API_TOKEN || null;
    this.partnerId = process.env.TIQETS_PARTNER_ID || null;
  }

  /**
   * Check if the client is configured.
   */
  isConfigured(): boolean {
    return !!this.apiToken;
  }

  /**
   * Test API connection.
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    if (!this.apiToken) {
      return {
        success: false,
        message: "TIQETS_API_TOKEN environment variable is not set",
      };
    }

    try {
      const response = await this.request("/cities", { limit: "1" });

      if (response.cities && Array.isArray(response.cities)) {
        return {
          success: true,
          message: `Connected to Tiqets API. Found ${response.total || 0} cities.`,
          data: {
            partnerId: this.partnerId,
            sampleCity: response.cities[0]?.name,
          },
        };
      }

      return {
        success: false,
        message: "Unexpected API response format",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  /**
   * Search for cities.
   */
  async searchCities(query: string): Promise<TiqetsCitiesResult> {
    const response = await this.request("/cities", { search: query });
    return {
      cities: response.cities || [],
      total: response.total || 0,
    };
  }

  /**
   * Get all cities (paginated).
   */
  async getCities(page: number = 1, perPage: number = 100): Promise<TiqetsCitiesResult> {
    const response = await this.request("/cities", {
      page: String(page),
      per_page: String(perPage),
    });
    return {
      cities: response.cities || [],
      total: response.total || 0,
    };
  }

  /**
   * Get products for a city.
   */
  async getProductsByCity(
    cityId: string,
    options: {
      page?: number;
      perPage?: number;
      category?: string;
    } = {}
  ): Promise<TiqetsSearchResult> {
    const params: Record<string, string> = {
      city_id: cityId,
      page: String(options.page || 1),
      per_page: String(options.perPage || 50),
    };

    if (options.category) {
      params.category = options.category;
    }

    const response = await this.request("/products", params);
    return {
      products: response.products || [],
      total: response.total || 0,
      page: response.page || 1,
      per_page: response.per_page || 50,
    };
  }

  /**
   * Search products.
   */
  async searchProducts(
    query: string,
    options: {
      cityId?: string;
      page?: number;
      perPage?: number;
    } = {}
  ): Promise<TiqetsSearchResult> {
    const params: Record<string, string> = {
      search: query,
      page: String(options.page || 1),
      per_page: String(options.perPage || 20),
    };

    if (options.cityId) {
      params.city_id = options.cityId;
    }

    const response = await this.request("/products", params);
    return {
      products: response.products || [],
      total: response.total || 0,
      page: response.page || 1,
      per_page: response.per_page || 20,
    };
  }

  /**
   * Get a single product by ID.
   */
  async getProduct(productId: string): Promise<TiqetsProduct | null> {
    try {
      const response = await this.request(`/products/${productId}`);
      return response.product || response;
    } catch (error) {
      logger.error({ productId, error }, "[TiqetsClient] Failed to get product");
      return null;
    }
  }

  /**
   * Get affiliate link for a product.
   */
  getAffiliateLink(productUrl: string): string {
    if (!this.partnerId) {
      return productUrl;
    }

    // Add partner tracking to URL
    const url = new URL(productUrl);
    url.searchParams.set("partner", this.partnerId);
    return url.toString();
  }

  /**
   * Make an authenticated API request.
   */
  private async request(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    if (!this.apiToken) {
      throw new Error("Tiqets API not configured");
    }

    // Build URL with query params
    const url = new URL(`${this.baseUrl}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    // Rate limiting
    await this.delay(this.rateLimitDelay);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        {
          status: response.status,
          endpoint,
          error: errorText,
        },
        "[TiqetsClient] API request failed"
      );
      throw new Error(`Tiqets API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const tiqetsClient = new TiqetsClient();

export function getTiqetsClient(): TiqetsClient {
  return tiqetsClient;
}
