/**
 * Tiqets Data Transformer
 * Converts Tiqets API data to our database format
 */

import type { InsertTiqetsAttraction } from "@shared/schema";

interface TiqetsProduct {
  id: string;
  title: string;
  product_slug: string;
  city_id: string;
  venue?:
    | {
        name: string;
        address?: string;
      }
    | string;
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

export class TiqetsTransformer {
  /**
   * Transform rating to label
   */
  static getRatingLabel(rating: number | null | undefined): string | null {
    if (!rating) return null;
    if (rating >= 4.5) return "Excellent Rating";
    if (rating >= 3.5) return "Good Rating";
    return null; // Don't show low ratings
  }

  /**
   * Generate URL-safe slug from title
   */
  static generateSlug(title: string, cityName: string): string {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .trim();

    const cleanCity = cityName.toLowerCase().replace(/\s+/g, "-");

    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36);

    return `${cleanTitle}-${cleanCity}-${timestamp}`.substring(0, 290);
  }

  /**
   * Extract venue name from Tiqets product
   */
  static getVenueName(venue: TiqetsProduct["venue"]): string | null {
    if (!venue) return null;
    if (typeof venue === "string") return venue;
    return venue.name || null;
  }

  /**
   * Extract venue address from Tiqets product
   */
  static getVenueAddress(venue: TiqetsProduct["venue"]): string | null {
    if (!venue) return null;
    if (typeof venue === "string") return null;
    return venue.address || null;
  }

  /**
   * Transform Tiqets product to our database format
   */
  static transformProduct(
    product: TiqetsProduct,
    cityName: string
  ): Omit<InsertTiqetsAttraction, "id" | "createdAt" | "updatedAt"> {
    const slug = this.generateSlug(product.title, cityName);
    const ratingLabel = this.getRatingLabel(product.rating);

    return {
      // Tiqets IDs
      tiqetsId: product.id,
      productSlug: product.product_slug || null,
      cityId: product.city_id || null,
      cityName: cityName,

      // Basic info (unchanged from Tiqets)
      title: product.title,
      slug: slug,
      venueName: this.getVenueName(product.venue),
      venueAddress: this.getVenueAddress(product.venue),

      // Geolocation
      latitude: product.latitude || null,
      longitude: product.longitude || null,

      // Technical details from Tiqets
      duration: product.duration || null,
      languages: product.languages || [],
      wheelchairAccess: product.wheelchair_access || false,
      smartphoneTicket: product.smartphone_ticket || false,
      instantTicketDelivery: product.instant_ticket_delivery || false,
      cancellationPolicy: product.cancellation || null,

      // Raw Tiqets data (for AI reference later - NOT displayed publicly)
      tiqetsHighlights: Array.isArray(product.highlights) ? product.highlights : [],
      tiqetsWhatsIncluded: Array.isArray(product.whats_included)
        ? product.whats_included.join("\n")
        : typeof product.whats_included === "string"
          ? product.whats_included
          : null,
      tiqetsWhatsExcluded: Array.isArray(product.whats_excluded)
        ? product.whats_excluded.join("\n")
        : typeof product.whats_excluded === "string"
          ? product.whats_excluded
          : null,
      tiqetsDescription: product.description || null,
      tiqetsImages: product.images || [],
      tiqetsRating: product.rating || null,
      tiqetsReviewCount: product.review_count || null,

      // Our processed fields (to be filled later by AI)
      ratingLabel: ratingLabel,
      highlights: null,
      whatsIncluded: null,
      whatsExcluded: null,
      description: null,
      h1Title: null,
      metaTitle: null,
      metaDescription: null,
      faqs: null,

      // Images (stored separately for AI generation later)
      images: [],

      // Categories (will be assigned later)
      primaryCategory: null,
      secondaryCategories: null,
      districtId: null,

      // Affiliate URL (already includes partner ID from Tiqets)
      productUrl: product.product_url || null,

      // Status
      status: "imported",
      lastSyncedAt: new Date(),
    };
  }

  /**
   * Transform multiple products
   */
  static transformProducts(
    products: TiqetsProduct[],
    cityName: string
  ): Omit<InsertTiqetsAttraction, "id" | "createdAt" | "updatedAt">[] {
    return products.map(product => this.transformProduct(product, cityName));
  }
}
