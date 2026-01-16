/**
 * LEGACY TRAVI Export Module
 * 
 * This module has been deprecated in favor of the new Tiqets integration system.
 * Export functionality will be rebuilt for the new Tiqets attractions table.
 */

export interface ExportLocation {
  id: number;
  externalId: string;
  destination: string;
  category: string;
  name: string;
  slug: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  highlights?: string[];
  tips?: string[];
  googleRating?: number;
  osmRating?: number;
  openingHours?: Record<string, string>;
  images: ExportImage[];
  attributions: Record<string, unknown>;
  affiliateLink: string;
  status: string;
  lastUpdated: string;
}

export interface ExportImage {
  url: string;
  altText: string;
  attribution: string;
  license: string;
}

export interface ExportResult {
  success: boolean;
  format: "json" | "csv";
  totalLocations: number;
  data?: string;
  errors?: string[];
}

export async function exportLocations(
  destination: string,
  category?: string,
  format: "json" | "csv" = "json"
): Promise<ExportResult> {
  return {
    success: false,
    format,
    totalLocations: 0,
    errors: ["This function has been deprecated. Use the new Tiqets export system."],
  };
}

export async function exportLocationById(
  locationId: number,
  format: "json" | "csv" = "json"
): Promise<ExportResult> {
  return {
    success: false,
    format,
    totalLocations: 0,
    errors: ["This function has been deprecated. Use the new Tiqets export system."],
  };
}
