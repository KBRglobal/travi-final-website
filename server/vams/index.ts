/**
 * VAMS (Visual Asset Management System)
 * Multi-source image management with stock APIs and AI generation
 */

// Types
export * from "./types";

// Providers
export {
  UnsplashProvider,
  unsplashProvider,
  PexelsProvider,
  pexelsProvider,
  PixabayProvider,
  pixabayProvider,
  getAvailableProviders,
  getProvider,
  getProviderStatus,
} from "./providers";

// Services
export {
  VamsSearchService,
  vamsSearchService,
  VamsIngestionService,
  vamsIngestionService,
  VamsGenerationService,
  vamsGenerationService,
} from "./services";

// Hooks
export {
  enrichContentWithImages,
  getContentHeroImage,
  getContentCardImage,
  getContentGalleryImages,
  postGenerationImageHook,
  contentNeedsImages,
  getContentImages,
  type ContentImageOptions,
  type ContentImageResult,
} from "./hooks";

// Routes
export { default as vamsRoutes } from "./routes";
