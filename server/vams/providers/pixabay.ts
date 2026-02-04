/**
 * Pixabay Provider
 * Free images with Pixabay License
 * API: https://pixabay.com/api/docs/
 */

import { VamsProviderInterface, VamsSearchOptions, ProviderSearchResult } from "../types";

const PIXABAY_API_URL = "https://pixabay.com/api";

export class PixabayProvider implements VamsProviderInterface {
  provider = "pixabay" as const;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.PIXABAY_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(options: VamsSearchOptions): Promise<ProviderSearchResult[]> {
    if (!this.apiKey) {
      console.warn("[PixabayProvider] PIXABAY_API_KEY not configured");
      return [];
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        q: options.query,
        page: String(options.page || 1),
        per_page: String(Math.min(options.perPage || 20, 200)), // Pixabay max is 200
        image_type: "photo",
        safesearch: "true",
      });

      if (options.orientation && options.orientation !== "any") {
        params.set("orientation", options.orientation === "square" ? "all" : options.orientation);
      }

      if (options.color) {
        params.set("colors", options.color);
      }

      if (options.minWidth) {
        params.set("min_width", String(options.minWidth));
      }

      if (options.minHeight) {
        params.set("min_height", String(options.minHeight));
      }

      if (options.locale) {
        params.set("lang", this.mapLocale(options.locale));
      }

      const response = await fetch(`${PIXABAY_API_URL}/?${params.toString()}`);

      if (!response.ok) {
        const error = await response.text();
        console.error("[PixabayProvider] API error:", response.status, error);
        return [];
      }

      const data = await response.json();

      return (data.hits || []).map(
        (hit: any): ProviderSearchResult => ({
          providerId: String(hit.id),
          provider: "pixabay",
          url: hit.largeImageURL || hit.webformatURL,
          thumbnailUrl: hit.previewURL,
          title: hit.tags,
          description: hit.tags,
          photographer: hit.user,
          photographerUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
          width: hit.imageWidth,
          height: hit.imageHeight,
          license: "Pixabay License",
          tags: hit.tags ? hit.tags.split(", ").map((t: string) => t.trim()) : [],
          colors: [],
        })
      );
    } catch (error) {
      console.error("[PixabayProvider] Search error:", error);
      return [];
    }
  }

  async getAsset(providerId: string): Promise<ProviderSearchResult | null> {
    if (!this.apiKey) return null;

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        id: providerId,
      });

      const response = await fetch(`${PIXABAY_API_URL}/?${params.toString()}`);

      if (!response.ok) return null;

      const data = await response.json();
      const hit = data.hits?.[0];

      if (!hit) return null;

      return {
        providerId: String(hit.id),
        provider: "pixabay",
        url: hit.largeImageURL || hit.webformatURL,
        thumbnailUrl: hit.previewURL,
        title: hit.tags,
        description: hit.tags,
        photographer: hit.user,
        photographerUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
        width: hit.imageWidth,
        height: hit.imageHeight,
        license: "Pixabay License",
        tags: hit.tags ? hit.tags.split(", ").map((t: string) => t.trim()) : [],
        colors: [],
      };
    } catch (error) {
      console.error("[PixabayProvider] Get asset error:", error);
      return null;
    }
  }

  /**
   * Map locale to Pixabay supported language codes
   */
  private mapLocale(locale: string): string {
    const langMap: Record<string, string> = {
      en: "en",
      "en-US": "en",
      de: "de",
      "de-DE": "de",
      fr: "fr",
      "fr-FR": "fr",
      es: "es",
      "es-ES": "es",
      it: "it",
      "it-IT": "it",
      pt: "pt",
      "pt-BR": "pt",
      ja: "ja",
      "ja-JP": "ja",
      ko: "ko",
      "ko-KR": "ko",
      zh: "zh",
      "zh-CN": "zh",
      ru: "ru",
      "ru-RU": "ru",
      he: "he",
      "he-IL": "he",
      ar: "ar",
      "ar-SA": "ar",
    };

    return langMap[locale] || "en";
  }
}

export const pixabayProvider = new PixabayProvider();
