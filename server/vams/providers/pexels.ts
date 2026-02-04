/**
 * Pexels Provider
 * Free stock photos with Pexels license
 * API: https://www.pexels.com/api/
 */

import { VamsProviderInterface, VamsSearchOptions, ProviderSearchResult } from "../types";

const PEXELS_API_URL = "https://api.pexels.com/v1";

export class PexelsProvider implements VamsProviderInterface {
  provider = "pexels" as const;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.PEXELS_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(options: VamsSearchOptions): Promise<ProviderSearchResult[]> {
    if (!this.apiKey) {
      console.warn("[PexelsProvider] PEXELS_API_KEY not configured");
      return [];
    }

    try {
      const params = new URLSearchParams({
        query: options.query,
        page: String(options.page || 1),
        per_page: String(options.perPage || 20),
      });

      if (options.orientation && options.orientation !== "any") {
        params.set("orientation", options.orientation);
      }

      if (options.color) {
        params.set("color", options.color);
      }

      if (options.locale) {
        params.set("locale", options.locale);
      }

      const response = await fetch(`${PEXELS_API_URL}/search?${params.toString()}`, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[PexelsProvider] API error:", response.status, error);
        return [];
      }

      const data = await response.json();

      return (data.photos || []).map(
        (photo: any): ProviderSearchResult => ({
          providerId: String(photo.id),
          provider: "pexels",
          url: photo.src?.large2x || photo.src?.large || photo.src?.original,
          thumbnailUrl: photo.src?.medium || photo.src?.small,
          title: photo.alt,
          description: photo.alt,
          photographer: photo.photographer,
          photographerUrl: photo.photographer_url,
          width: photo.width,
          height: photo.height,
          license: "Pexels License",
          tags: [],
          colors: photo.avg_color ? [photo.avg_color] : [],
        })
      );
    } catch (error) {
      console.error("[PexelsProvider] Search error:", error);
      return [];
    }
  }

  async getAsset(providerId: string): Promise<ProviderSearchResult | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${PEXELS_API_URL}/photos/${providerId}`, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      if (!response.ok) return null;

      const photo = await response.json();

      return {
        providerId: String(photo.id),
        provider: "pexels",
        url: photo.src?.large2x || photo.src?.large || photo.src?.original,
        thumbnailUrl: photo.src?.medium || photo.src?.small,
        title: photo.alt,
        description: photo.alt,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        width: photo.width,
        height: photo.height,
        license: "Pexels License",
        tags: [],
        colors: photo.avg_color ? [photo.avg_color] : [],
      };
    } catch (error) {
      console.error("[PexelsProvider] Get asset error:", error);
      return null;
    }
  }
}

export const pexelsProvider = new PexelsProvider();
