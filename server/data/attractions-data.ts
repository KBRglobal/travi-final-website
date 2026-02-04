/**
 * Attractions Data (Stub)
 * Static attraction data was removed during cleanup.
 * This stub provides minimal types for backwards compatibility.
 */

export const TIQETS_AFFILIATE_LINK = "https://www.tiqets.com";

export interface DestinationInfo {
  name: string;
  country: string;
  cityId?: string;
}

export const tiqetsDestinations: Record<string, DestinationInfo> = {
  dubai: { name: "Dubai", country: "United Arab Emirates" },
  "abu-dhabi": { name: "Abu Dhabi", country: "United Arab Emirates" },
  paris: { name: "Paris", country: "France" },
  london: { name: "London", country: "United Kingdom" },
  tokyo: { name: "Tokyo", country: "Japan" },
  singapore: { name: "Singapore", country: "Singapore" },
  bangkok: { name: "Bangkok", country: "Thailand" },
  barcelona: { name: "Barcelona", country: "Spain" },
  rome: { name: "Rome", country: "Italy" },
  amsterdam: { name: "Amsterdam", country: "Netherlands" },
  "new-york": { name: "New York", country: "United States" },
  istanbul: { name: "Istanbul", country: "Turkey" },
  cairo: { name: "Cairo", country: "Egypt" },
  marrakech: { name: "Marrakech", country: "Morocco" },
  bali: { name: "Bali", country: "Indonesia" },
  "hong-kong": { name: "Hong Kong", country: "Hong Kong" },
  seoul: { name: "Seoul", country: "South Korea" },
};

export interface AttractionInfo {
  id: string;
  name: string;
  category?: string;
}

export const attractionsByDestination: Record<string, AttractionInfo[]> = {};
