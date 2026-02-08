/**
 * Sanitize a URL for use in img src, a href, and other DOM attributes.
 * Only allows http:, https:, and relative (/) URLs.
 * Blocks javascript:, data:, vbscript:, and other dangerous protocols.
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  // Allow relative URLs
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  // Allow http(s) URLs only
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return trimmed;
  } catch {
    // Invalid URL
  }
  return "";
}

/**
 * Sanitize a slug for use in URL paths.
 * Only allows alphanumeric, hyphens, underscores.
 */
export function sanitizeSlug(slug: string | undefined | null): string {
  if (!slug || typeof slug !== "string") return "";
  return slug.replace(/[^a-zA-Z0-9_-]/g, "");
}
