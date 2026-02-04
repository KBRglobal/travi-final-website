/**
 * Unsplash Provider
 * Free high-resolution photos with CC0 license
 * API: https://unsplash.com/developers
 */

import { VamsProviderInterface, VamsSearchOptions, ProviderSearchResult } from "../types";

const UNSPLASH_API_URL = "https://api.unsplash.com";

export class UnsplashProvider implements VamsProviderInterface {
  provider = "unsplash" as const;
  private accessKey: string | undefined;

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY;
  }

  isAvailable(): boolean {
    return !!this.accessKey;
  }

  async search(options: VamsSearchOptions): Promise<ProviderSearchResult[]> {
    if (!this.accessKey) {
      console.warn("[UnsplashProvider] UNSPLASH_ACCESS_KEY not configured");
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

      const response = await fetch(`${UNSPLASH_API_URL}/search/photos?${params.toString()}`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          "Accept-Version": "v1",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[UnsplashProvider] API error:", response.status, error);
        return [];
      }

      const data = await response.json();

      return (data.results || []).map(
        (photo: any): ProviderSearchResult => ({
          providerId: photo.id,
          provider: "unsplash",
          url: photo.urls?.regular || photo.urls?.full,
          thumbnailUrl: photo.urls?.thumb || photo.urls?.small,
          title: photo.description || photo.alt_description,
          description: photo.description,
          photographer: photo.user?.name,
          photographerUrl: photo.user?.links?.html,
          width: photo.width,
          height: photo.height,
          license: "Unsplash License",
          tags: (photo.tags || []).map((t: any) => t.title).filter(Boolean),
          colors: photo.color ? [photo.color] : [],
        })
      );
    } catch (error) {
      console.error("[UnsplashProvider] Search error:", error);
      return [];
    }
  }

  async getAsset(providerId: string): Promise<ProviderSearchResult | null> {
    if (!this.accessKey) return null;

    try {
      const response = await fetch(`${UNSPLASH_API_URL}/photos/${providerId}`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          "Accept-Version": "v1",
        },
      });

      if (!response.ok) return null;

      const photo = await response.json();

      return {
        providerId: photo.id,
        provider: "unsplash",
        url: photo.urls?.regular || photo.urls?.full,
        thumbnailUrl: photo.urls?.thumb || photo.urls?.small,
        title: photo.description || photo.alt_description,
        description: photo.description,
        photographer: photo.user?.name,
        photographerUrl: photo.user?.links?.html,
        width: photo.width,
        height: photo.height,
        license: "Unsplash License",
        tags: (photo.tags || []).map((t: any) => t.title).filter(Boolean),
        colors: photo.color ? [photo.color] : [],
      };
    } catch (error) {
      console.error("[UnsplashProvider] Get asset error:", error);
      return null;
    }
  }

  /**
   * Track download (required by Unsplash API guidelines)
   */
  async trackDownload(providerId: string): Promise<void> {
    if (!this.accessKey) return;

    try {
      await fetch(`${UNSPLASH_API_URL}/photos/${providerId}/download`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
      });
    } catch (error) {
      console.error("[UnsplashProvider] Track download error:", error);
    }
  }
}

export const unsplashProvider = new UnsplashProvider();
