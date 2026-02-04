/**
 * Image SEO Utilities - Minimal version
 * Only includes functions actually in use
 */

export interface ImageLocation {
  name: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
  geo?: {
    latitude: string;
    longitude: string;
  };
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcset(
  baseUrl: string,
  widths: number[] = [400, 600, 800, 1000, 1200, 1600, 1920]
): string {
  // Check if URL supports width parameters
  if (baseUrl.includes("unsplash.com")) {
    return widths.map(w => `${baseUrl.replace(/w=\d+/, `w=${w}`)} ${w}w`).join(", ");
  }

  // For other URLs, assume they support width parameter
  const separator = baseUrl.includes("?") ? "&" : "?";
  return widths.map(w => `${baseUrl}${separator}w=${w} ${w}w`).join(", ");
}

/**
 * Generate sizes attribute based on common breakpoints
 */
export function generateSizes(
  type: "hero" | "featured" | "content" | "thumbnail" | "gallery" = "content"
): string {
  switch (type) {
    case "hero":
      return "100vw";
    case "featured":
      return "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px";
    case "content":
      return "(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px";
    case "thumbnail":
      return "(max-width: 480px) 100vw, (max-width: 768px) 50vw, 400px";
    case "gallery":
      return "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";
    default:
      return "100vw";
  }
}
