/**
 * Tiqets API Client
 * Handles communication with Tiqets Partner API v2
 */

interface TiqetsCity {
  id: string;
  name: string;
  country_id?: string;
  country_name?: string;
}

interface TiqetsProduct {
  id: string;
  title: string;
  product_slug: string;
  city_id: string;
  venue?: {
    name: string;
    address?: string;
  } | string;
  description?: string;
  highlights?: string[];
  whats_included?: string[];
  whats_excluded?: string[];
  images?: Array<{
    url: string;
    caption?: string;
  }>;
  rating?: number;
  review_count?: number;
  duration?: string;
  languages?: string[];
  wheelchair_access?: boolean;
  smartphone_ticket?: boolean;
  instant_ticket_delivery?: boolean;
  cancellation?: string;
  product_url: string;
  price?: {
    value: number;
    currency: string;
  };
  latitude?: string;
  longitude?: string;
}

interface TiqetsCitiesResponse {
  success: boolean;
  cities: TiqetsCity[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

interface TiqetsProductsResponse {
  success: boolean;
  products: TiqetsProduct[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

export class TiqetsClient {
  private baseUrl = 'https://api.tiqets.com/v2';
  private token: string;
  private partnerId: string;
  
  constructor() {
    this.token = process.env.TIQETS_API_TOKEN || '';
    this.partnerId = process.env.TIQETS_PARTNER_ID || '';
    
    if (!this.token) {
      console.warn('⚠️ TIQETS_API_TOKEN not configured');
    }
  }
  
  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Token ${this.token}`,
      'Accept': 'application/json',
      'User-Agent': 'TRAVI-World/1.0'
    };
  }
  
  /**
   * Get cities from Tiqets (paginated)
   */
  async getCities(page = 1): Promise<TiqetsCitiesResponse> {
    const response = await fetch(
      `${this.baseUrl}/cities?page=${page}&page_size=100`,
      { headers: this.getHeaders() }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tiqets API error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }
  
  /**
   * Get products for a city (paginated)
   */
  async getProducts(cityId: string, page = 1): Promise<TiqetsProductsResponse> {
    const response = await fetch(
      `${this.baseUrl}/products?city_id=${cityId}&page=${page}&page_size=100&lang=en&currency=USD`,
      { headers: this.getHeaders() }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tiqets API error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }
  
  /**
   * Get a single product by ID
   */
  async getProduct(productId: string): Promise<TiqetsProduct> {
    const response = await fetch(
      `${this.baseUrl}/products/${productId}?lang=en&currency=USD`,
      { headers: this.getHeaders() }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tiqets API error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }
  
  /**
   * Test connection to Tiqets API
   */
  async testConnection(): Promise<{ success: boolean; message: string; cityCount?: number }> {
    try {
      if (!this.token) {
        return { success: false, message: 'TIQETS_API_TOKEN not configured' };
      }
      
      const response = await this.getCities(1);
      return { 
        success: true, 
        message: `Connected successfully. Found ${response.pagination?.total || 0} cities.`,
        cityCount: response.pagination?.total
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'Unknown error' 
      };
    }
  }
}

export const tiqetsClient = new TiqetsClient();
