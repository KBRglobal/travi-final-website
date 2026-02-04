/**
 * VAMS (Visual Asset Management System) Types
 * Multi-source image management with stock APIs and AI generation
 */

// Provider types
export type VamsProvider = "unsplash" | "pexels" | "pixabay" | "dalle" | "flux" | "upload" | "url";

// Asset status
export type VamsAssetStatus = "pending" | "processing" | "ready" | "failed" | "archived";

// Variant types for responsive images
export type VamsVariantType = "hero" | "card" | "og" | "thumbnail" | "gallery" | "mobile";

// Search result from any provider
export interface ProviderSearchResult {
  providerId: string;
  provider: VamsProvider;
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  photographer?: string;
  photographerUrl?: string;
  width?: number;
  height?: number;
  license?: string;
  tags?: string[];
  colors?: string[];
}

// Unified search options
export interface VamsSearchOptions {
  query: string;
  providers?: VamsProvider[];
  page?: number;
  perPage?: number;
  orientation?: "landscape" | "portrait" | "square" | "any";
  color?: string;
  minWidth?: number;
  minHeight?: number;
  locale?: string;
}

// Unified search result
export interface VamsSearchResult {
  success: boolean;
  query: string;
  totalResults: number;
  results: ProviderSearchResult[];
  providers: {
    provider: VamsProvider;
    results: number;
    error?: string;
  }[];
  cached: boolean;
  searchTimeMs: number;
}

// Ingestion options
export interface VamsIngestionOptions {
  providerId?: string;
  provider?: VamsProvider;
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
  generateVariants?: VamsVariantType[];
  generateAltText?: boolean;
  altTextLocales?: string[];
}

// Ingestion result
export interface VamsIngestionResult {
  success: boolean;
  assetId?: string;
  storedUrl?: string;
  variants?: {
    type: VamsVariantType;
    url: string;
    width: number;
    height: number;
  }[];
  altText?: string;
  altTextLocales?: Record<string, string>;
  error?: string;
  processingTimeMs: number;
}

// AI generation options
export interface VamsGenerationOptions {
  prompt: string;
  model?: "dalle" | "flux";
  style?: string;
  aspectRatio?: "1:1" | "16:9" | "4:3" | "3:2" | "9:16";
  quality?: "standard" | "hd";
  generateVariants?: VamsVariantType[];
  generateAltText?: boolean;
  altTextLocales?: string[];
}

// AI generation result
export interface VamsGenerationResult {
  success: boolean;
  assetId?: string;
  url?: string;
  storedUrl?: string;
  variants?: {
    type: VamsVariantType;
    url: string;
    width: number;
    height: number;
  }[];
  altText?: string;
  altTextLocales?: Record<string, string>;
  prompt: string;
  model?: string;
  error?: string;
  generationTimeMs: number;
}

// Content attachment
export interface VamsContentAttachment {
  contentId: string;
  assetId: string;
  role: "hero" | "card" | "gallery" | "inline";
  position?: number;
  caption?: string;
  altTextOverride?: string;
}

// Provider interface
export interface VamsProviderInterface {
  provider: VamsProvider;
  isAvailable(): boolean;
  search(options: VamsSearchOptions): Promise<ProviderSearchResult[]>;
  getAsset?(providerId: string): Promise<ProviderSearchResult | null>;
}

// Variant specifications
export const VARIANT_SPECS: Record<
  VamsVariantType,
  {
    maxWidth: number;
    maxHeight?: number;
    quality: number;
    format: "webp" | "avif" | "jpg";
  }
> = {
  hero: { maxWidth: 1920, quality: 85, format: "webp" },
  card: { maxWidth: 400, maxHeight: 300, quality: 80, format: "webp" },
  og: { maxWidth: 1200, maxHeight: 630, quality: 85, format: "jpg" },
  thumbnail: { maxWidth: 200, quality: 75, format: "webp" },
  gallery: { maxWidth: 800, quality: 80, format: "webp" },
  mobile: { maxWidth: 640, quality: 80, format: "webp" },
};

// Default providers by priority
export const DEFAULT_PROVIDERS: VamsProvider[] = ["unsplash", "pexels", "pixabay"];
