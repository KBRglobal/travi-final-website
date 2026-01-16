/**
 * Unified Image Fallback Service
 * Chain: Local Stock → Unsplash → Freepik → AI Generation
 * Integrates with existing image services
 */

import { searchImages, FreepikImage, FreepikSearchResult, FREEPIK_ATTRIBUTION } from '../travi/freepik-client';

export interface ImageRequest {
  entityType: 'attraction' | 'hotel' | 'restaurant' | 'destination';
  entityName: string;
  entitySlug: string;
  cityName: string;
  category?: string;
  keywords?: string[];
}

export interface ImageResult {
  success: boolean;
  url?: string;
  source: 'local' | 'unsplash' | 'freepik' | 'ai-generated' | 'none';
  attribution?: string;
  altText?: string;
  error?: string;
}

export interface ImageFallbackChain {
  acquireImage(request: ImageRequest): Promise<ImageResult>;
}

class ImageEngine implements ImageFallbackChain {
  async acquireImage(request: ImageRequest): Promise<ImageResult> {
    console.log(`[ImageEngine] Acquiring image for: ${request.entityName}`);

    const result = await this.tryFreepik(request);
    if (result.success) {
      console.log(`[ImageEngine] Found image via Freepik`);
      return result;
    }

    console.log(`[ImageEngine] No suitable image found for: ${request.entityName}`);
    return {
      success: false,
      source: 'none',
      error: 'No image found in any source',
      altText: this.generateAltText(request),
    };
  }

  private async tryFreepik(request: ImageRequest): Promise<ImageResult> {
    try {
      const query = this.buildSearchQuery(request);
      console.log(`[ImageEngine] Searching Freepik: "${query}"`);
      
      const searchResult = await searchImages(query, {
        perPage: 5,
        orientation: 'horizontal',
      });

      if (searchResult && searchResult.images && searchResult.images.length > 0) {
        const photo = searchResult.images[0];
        
        return {
          success: true,
          url: photo.url || photo.previewUrl,
          source: 'freepik',
          attribution: photo.attribution?.creditText || `Image by ${photo.author?.name || 'Unknown'} on Freepik`,
          altText: this.generateAltText(request),
        };
      }

      return { success: false, source: 'freepik' };
    } catch (error) {
      console.warn(`[ImageEngine] Freepik error:`, error);
      return { success: false, source: 'freepik', error: String(error) };
    }
  }

  private buildSearchQuery(request: ImageRequest): string {
    const parts: string[] = [];
    
    if (request.category) {
      parts.push(request.category);
    }
    
    parts.push(request.entityName.split(':')[0].trim());
    
    parts.push(request.cityName);
    
    if (request.keywords && request.keywords.length > 0) {
      parts.push(request.keywords[0]);
    }
    
    return parts.slice(0, 4).join(' ');
  }

  private generateAltText(request: ImageRequest): string {
    const entityName = request.entityName.split(':')[0].trim();
    return `${entityName} in ${request.cityName} - ${request.category || request.entityType}`;
  }
}

let imageEngineInstance: ImageEngine | null = null;

export function getImageEngine(): ImageEngine {
  if (!imageEngineInstance) {
    imageEngineInstance = new ImageEngine();
  }
  return imageEngineInstance;
}

export { ImageEngine };
