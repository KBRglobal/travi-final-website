/**
 * Hook for fetching public destination data
 * Used by public destination pages - NO AUTH REQUIRED
 */

import { useQuery } from "@tanstack/react-query";
import type { FeaturedAttraction, FeaturedArea, FeaturedHighlight } from "@shared/schema";

export interface HeroImage {
  filename: string;
  url: string;
  alt: string;
  order: number;
}

export interface DestinationMood {
  primaryColor: string;
  gradientFrom: string;
  gradientTo: string;
  vibe: string;
  tagline: string;
}

export interface PublicDestinationData {
  id: string;
  name: string;
  country: string;
  slug: string;
  summary: string;
  cardImage: string;
  cardImageAlt: string;
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    images: HeroImage[];
  };
  featuredAttractions: FeaturedAttraction[];
  featuredAreas: FeaturedArea[];
  featuredHighlights: FeaturedHighlight[];
  mood: DestinationMood;
}

/**
 * Fetches public destination data including hero images and featured sections
 * NO AUTH REQUIRED - powers the public destination pages
 */
export function usePublicDestination(destinationId: string | undefined) {
  return useQuery<PublicDestinationData>({
    queryKey: ["/api/public/destinations", destinationId],
    queryFn: async () => {
      const res = await fetch(`/api/public/destinations/${destinationId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch destination: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!destinationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
