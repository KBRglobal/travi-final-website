// Stub - image engine not in use

export interface ImageRequest {
  entityType: "attraction" | "hotel" | "restaurant" | "destination";
  entityName: string;
  entitySlug: string;
  cityName: string;
  category?: string;
  keywords?: string[];
}

export interface ImageResult {
  success: boolean;
  url?: string;
  source: "local" | "unsplash" | "freepik" | "ai-generated" | "none";
  attribution?: string;
  altText?: string;
  error?: string;
}

export class ImageEngine {
  acquireImage(_request: ImageRequest): Promise<ImageResult> {
    return Promise.resolve({ success: false, source: "none" });
  }
}

let imageEngineInstance: ImageEngine | null = null;

export function getImageEngine(): ImageEngine {
  if (!imageEngineInstance) {
    imageEngineInstance = new ImageEngine();
  }
  return imageEngineInstance;
}
