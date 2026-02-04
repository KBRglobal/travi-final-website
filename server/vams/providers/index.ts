/**
 * VAMS Providers Index
 * Export all stock image providers
 */

export { UnsplashProvider, unsplashProvider } from "./unsplash";
export { PexelsProvider, pexelsProvider } from "./pexels";
export { PixabayProvider, pixabayProvider } from "./pixabay";

import { unsplashProvider } from "./unsplash";
import { pexelsProvider } from "./pexels";
import { pixabayProvider } from "./pixabay";
import { VamsProviderInterface, VamsProvider } from "../types";

/**
 * Get all available providers
 */
export function getAvailableProviders(): VamsProviderInterface[] {
  const providers: VamsProviderInterface[] = [unsplashProvider, pexelsProvider, pixabayProvider];

  return providers.filter(p => p.isAvailable());
}

/**
 * Get provider by name
 */
export function getProvider(name: VamsProvider): VamsProviderInterface | null {
  switch (name) {
    case "unsplash":
      return unsplashProvider.isAvailable() ? unsplashProvider : null;
    case "pexels":
      return pexelsProvider.isAvailable() ? pexelsProvider : null;
    case "pixabay":
      return pixabayProvider.isAvailable() ? pixabayProvider : null;
    default:
      return null;
  }
}

/**
 * Get provider status
 */
export function getProviderStatus(): Record<string, boolean> {
  return {
    unsplash: unsplashProvider.isAvailable(),
    pexels: pexelsProvider.isAvailable(),
    pixabay: pixabayProvider.isAvailable(),
  };
}
