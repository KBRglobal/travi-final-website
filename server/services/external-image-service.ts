// Stub - external image service removed
export interface AIGenerationOptions {
  prompt?: string;
  style?: string;
  size?: string;
  quality?: string;
  provider?: string;
  altText?: string;
  contentId?: number;
  [key: string]: any;
}

export interface FreepikSearchOptions {
  query?: string;
  limit?: number;
  page?: number;
  orientation?: string;
  premium?: boolean;
  [key: string]: any;
}

export interface GeneratedImageResult {
  success: boolean;
  url?: string;
  image?: any;
  error?: string;
  results?: any[];
  [key: string]: any;
}

export interface ExternalImageService {
  generateWithDALLE(options: any): Promise<any>;
  searchFreepik(options: any, extra?: any): Promise<any>;
  generateAndStoreAIImage(prompt: any, filename?: any, options?: any): Promise<any>;
  downloadFromFreepik(imageId: any, contentType?: any, contentId?: any): Promise<any>;
}

export function getExternalImageService(): ExternalImageService {
  return {
    async generateWithDALLE() {
      return { success: false, error: "Service disabled" };
    },
    async searchFreepik() {
      return { success: false, error: "Service disabled", results: [] };
    },
    async generateAndStoreAIImage() {
      return { success: false, error: "Service disabled" };
    },
    async downloadFromFreepik() {
      return { success: false, error: "Service disabled" };
    },
  };
}
